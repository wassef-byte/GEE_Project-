//data var s1 = ee.ImageCollection("COPERNICUS/S1_GRD"),
//table = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2");
//FAO GAUL 500m Simplified: Global Administrative Unit Layers 2015, Second-Level Administrative Units
var roi = table.filter(ee.Filter.or(
    ee.Filter.eq('ADM2_NAME', 'Bou Salem'))).geometry();
  // Zoom to bounds
  Map.centerObject(roi);
  
  
  // Set map style
  Map.setOptions('HYBRID');
  
  // Years to analyze
  var years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
  
  // Property for wet and dry season
  var props = [
    { name: 'wet', start: '-12-01', end: '-12-31', palette: 'navy' }, // Adjust your countries wet season date
    { name: 'dry', start: '-08-01', end: '-08-31', palette: 'lightskyblue' } // Adjust your countries dry season date
  ];
  
  // Run per year
  var images = ee.ImageCollection(years.map(function(year){
    // Run for wet and dry season
    var imageSeasons = ee.Image(props.map(function(prop){
      // Get minimum composite of sentinel-1 collection
      var image = s1
        .filterBounds(roi)
        .filterDate(year + prop.start, year + prop.end)
        .filter(ee.Filter.eq('transmitterReceiverPolarisation', ['VV', 'VH'])) // Only use the one with VV and VH bands
        .select('VV'); // Only take VV bands
      
      var imageMin = image.reduce(ee.Reducer.percentile([10])) // Do minimum composite
        .clip(roi) // Clip
        .focalMean(50, 'square', 'meters'); // Speckle filtering 
        
      // Show image
      Map.addLayer(imageMin, { min: -20, max: 0 }, 'S1 ' + year + ' ' + prop.name, false);
      
      // Get water mask from the image
      var water = imageMin.lt(-15).toByte().rename('water_' + prop.name);
      Map.addLayer(water.selfMask(), { palette: prop.palette }, 'Water ' + year + ' ' + prop.name, false);
      
      // Return water mask
      return ee.Image([water]);
    }));
    
    // Water permanent
    var waterWet = imageSeasons.select('water_wet');
    var waterDry = imageSeasons.select('water_dry');
    
    // Get flood from wet and dry season
    var flood = waterWet.and(waterDry.eq(0)).rename('flood').toByte();
    
    // Permanent water
    var allWater = waterDry.or(waterWet).rename('water');
    
    // Show flood
    Map.addLayer(flood.selfMask(), { palette: 'blue' }, 'Flood ' + year, false);
    
    // Calculate flood area
    var floodArea = ee.Number(ee.Image.pixelArea().multiply(1e-4).updateMask(flood).reduceRegion({
      scale: 100,
      geometry: roi,
      reducer: ee.Reducer.sum(),
      maxPixels: 1e13
    }).get('area'));
    
    // Return water and flood area
    return ee.Image([flood.selfMask(), allWater]).set({
      year: String(year),
      year_num: year,
      flood_area: floodArea
    });
  }));
  
  // Mapping flood hazard from how oftern the flood happen every year
  var floodHazard = images.select('flood').sum().divide(years.length);
  Map.addLayer(floodHazard, { min: 0, max: 1, palette: ['white', 'pink', 'red'] }, 'Flood hazard');
  
  // Legend flood hazard
  legendPanelGradient('Flood hazard index', { min: 0, max: 1, palette: ['white', 'pink', 'red'] }, 'bottom-left');
  
  // Permanent water
  var waterPermanent = images.select('water').reduce(ee.Reducer.allNonZero()).and(floodHazard.mask().eq(0)).rename('water');
  Map.addLayer(waterPermanent.selfMask(), { palette: 'blue' }, 'Permanent water');
  
  // Legend permanent water
  legendDiscrete(['Permanent water'], ['blue']);
  
  // Show border
  Map.addLayer(ee.Image().paint(ee.FeatureCollection([ee.Feature(roi)]), 0, 2), { palette: 'red' }, 'Boundary');
  
  // Calculate flood area per year in chart
  var chart = ui.Chart.feature.byFeature(images, 'year', ['flood_area'])
    .setChartType('ColumnChart')
    .setOptions({
      title: 'Flood Area (Ha) 2065 - 2023',
      vAxis: { title: 'Flood area (Ha)' },
      hAxis: { title: 'Year' },
      series: {
        0: { color: 'lightskyblue' }
      }
    });
  print(chart);
  
  // Legend discrete
  function legendDiscrete(names, palette){
    var legend = ui.Panel([], ui.Panel.Layout.flow('vertical'), { position: 'bottom-left' });
    names.map(function(name, index){
      legend.add(ui.Panel([
        ui.Label('', { width: '30px', height: '15px', backgroundColor: palette[index], border: 'thin solid black' }),
        ui.Label(name)
      ], ui.Panel.Layout.flow('horizontal')));
    });
    Map.add(legend);
  }
  
  // Legend function
  function legendPanelGradient(name, vis, position){
    var geom = ee.Geometry({
      "geodesic": false,
      "type": "Polygon",
      "coordinates": [
        [
          [
            112.38333164500061,
            -0.4965121527071768
          ],
          [
            112.45199619578186,
            -0.4965121527071768
          ],
          [
            112.45199619578186,
            0.011599308565035363
          ],
          [
            112.38333164500061,
            0.011599308565035363
          ],
          [
            112.38333164500061,
            -0.4965121527071768
          ]
        ]
      ]
    });
    
    var panel = ui.Panel([ui.Label(name, { fontWeight: 'bold', stretch: 'horizontal', textAlign: 'center' })], ui.Panel.Layout.flow('vertical'), { position: position, stretch: 'horizontal' });
    var lonLat = ee.Image.pixelLonLat().select('latitude').clip(geom);
    var minMax = lonLat.reduceRegion({
      scale: 100,
      maxPixels: 1e13,
      reducer: ee.Reducer.minMax(),
      geometry: geom
    });
    var max = ee.Number(minMax.get('latitude_max'));
    var min = ee.Number(minMax.get('latitude_min'));
    var visualized = lonLat.visualize({ min: min, max: max, palette: vis.palette });
    var thumbnail = ui.Thumbnail(visualized, {}, null, { border: '0.5px solid black', textAlign: 'center', stretch: 'horizontal', height: '200px' });
    
    panel.add(ui.Label(vis.max, { textAlign: 'center', stretch: 'horizontal' }));
    panel.add(thumbnail);
    panel.add(ui.Label(vis.min, { textAlign: 'center', stretch: 'horizontal'}));
    Map.add(panel);
  }