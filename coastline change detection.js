//data and Roi 
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2"),
    l4 = ee.ImageCollection("LANDSAT/LT04/C02/T1_L2"),
    l5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2"),
    l7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2"),
    l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"),
    roi = 
    /* color: #0b4a8b */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[10.271682547298301, 36.89019570870315],
          [10.271682547298301, 36.706552564971254],
          [10.619811819759239, 36.706552564971254],
          [10.619811819759239, 36.89019570870315]]], null, false);
// Main Code
// Year list to map
var yearList = [1990,  2005, 2023];

// Function to filter
function filterCol(col, roi, date){
  return col.filterDate(date[0], date[1]).filterBounds(roi);
}

// Composite function
function landsat457(roi, date){
  var col = filterCol(l4, roi, date).merge(filterCol(l5, roi, date)).merge(filterCol(l7, roi, date));
  var image = col.map(cloudMaskTm).median().clip(roi);
  return image;
}

function landsat89(roi, date){
  var col = filterCol(l8, roi, date).merge(filterCol(l9, roi, date));
  var image = col.map(cloudMaskOli).median().clip(roi);
  return image;
}

// Cloud mask
function cloudMaskTm(image){
  var qa = image.select('QA_PIXEL');
  var dilated = 1 << 1;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  
  return image.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'], ['B2', 'B3', 'B4', 'B5', 'B6', 'B7']).updateMask(mask);
}

function cloudMaskOli(image){
  var qa = image.select('QA_PIXEL');
  var dilated = 1 << 1;
  var cirrus = 1 << 2;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cirrus).eq(0))
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  
  return image.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['B2', 'B3', 'B4', 'B5', 'B6', 'B7']).updateMask(mask);
}

// Generate image per year
var coastCol = ee.ImageCollection(yearList.map(function(year){
  var start;
  var end;
  
  // Conditional on landsat collection to use
  var landsat;
  if (year < 2014) {
    start = ee.Date.fromYMD(year - 1 , 1, 1);
    end = ee.Date.fromYMD(year + 1, 12, 31);
    landsat = landsat457;
  } else {
    start = ee.Date.fromYMD(year , 1, 1);
    end = ee.Date.fromYMD(year, 12, 31);
    landsat = landsat89;
  }
  
  var date = [start, end];
  
  // Create an image composite
  var image = landsat(roi, date).multiply(0.0000275).add(-0.2);
  
  // Show the image
  Map.addLayer(image, { min: [0.1, 0.05, 0], max: [0.4, 0.3, 0.2], bands: ['B5', 'B6', 'B2'] }, 'Landsat_' + year, false);
  
  // Band map
  var bandMap = { 
    NIR: image.select('B5'), 
    SWIR: image.select('B6'), 
    RED: image.select('B4'), 
    GREEN: image.select('B3'), 
    BLUE: image.select('B2') 
  };
  
  // Normalized Difference Water Index
  var ndwi = image.expression('(GREEN - NIR) / (GREEN + NIR)', bandMap).rename('NDWI');
  Map.addLayer(ndwi, { min: -1, max: 1, palette: ['red', 'white', 'blue'] }, 'NDWI_' + year, false);

  // Land area
  var land = ndwi.lt(0.1).selfMask();
  Map.addLayer(land, { palette: 'gold' }, 'Land_' + year, false);
  
  // Land area
  var water = ndwi.gte(0.1).selfMask();
  Map.addLayer(water, { palette: 'navy' }, 'Water_' + year, false);
  
  return land.multiply(year).rename('coast').toUint16();
}));


// Function to convert image to vectors
function imageToVectors(image) {
  // Reduce image to vectors with specified options
  var polylines = image.reduceToVectors({
    geometry: roi,
    scale: 30, // adjust scale for desired vector detail
    eightConnected: true,
    maxPixels: 1e10,
    tileScale: 16
  });
  return polylines;
}

// Apply function to get coastline vectors for each year
var coastalVectors = coastCol.map(imageToVectors);
var exportResolutionMeters = 30;
// Combine all vector features into a single collection
var finalVectors = coastalVectors.flatten();
var simplifyAndExtractCoastline = function(vectors){
  // Simplify vectors
  var processedVectors = vectors.map(function(f) {
    var coords = f.geometry()
      .simplify({maxError: exportResolutionMeters})
      .coordinates();
     
    // Buffer the geometry by a pixel to avoid rasterizing
    // the boundary polygon
    var bufferDistance = ee.Number(
      exportResolutionMeters).multiply(-2.777773);
    return f
      .setGeometry(
        ee.Geometry.MultiLineString(coords)
          .intersection(roi.buffer(bufferDistance)));
  });
  return processedVectors;
};
 
var coastlineVector = simplifyAndExtractCoastline(finalVectors);

// Forest visual
var vis = {
  'coast_class_values': yearList,
  'coast_class_palette': [ '228B22', 'FFD700', 'FF0000']
};

var coastalChange = coastCol.max().set(vis);
function styleFeature(feature) {
  var year = feature.get('coast_class_values'); // Assuming year is stored in this property
  var color = getColorFromPalette(year); // Function to get color based on year and palette
  return ee.Feature(feature.geometry(), {color: color});
}

function getColorFromPalette(year) {
  var index = yearList.indexOf(year);
  if (index !== -1) {
    return vis['palette'][index]; // Get color from palette using index
  } else {
    // Return a distinct color for missing years (e.g., 'transparent' or 'lightgray')
    return 'lightgray';
  }
}
//var styledVectors = coastlineVector.map(styleFeature); 
var styledVectors = finalVectors.map(styleFeature);

// Generate image per year and add time band.
var coastCol = ee.ImageCollection(yearList.map(function(year) {
  var start, end, landsat;
  if (year < 2014) {
    start = ee.Date.fromYMD(year - 1, 1, 1);
    end = ee.Date.fromYMD(year + 1, 12, 31);
    landsat = landsat457;
  } else {
    start = ee.Date.fromYMD(year, 1, 1);
    end = ee.Date.fromYMD(year, 12, 31);
    landsat = landsat89;
  }
  
  var date = [start, end];
  var image = landsat(roi, date).multiply(0.0000275).add(-0.2);
  
  // Add a time band to the image.
  var timeImage = image.addBands(ee.Image.constant(year).rename('year')).float();
  
  return timeImage.visualize({min: [0.1, 0.05, 0], max: [0.4, 0.3, 0.2], bands: ['B6', 'B5', 'B2']})
                  .set({year: year});
}));

// Generate the GIF animation.
var gifParams = {
  region: roi,
  dimensions: 600,
  framesPerSecond: 2,
  format: 'gif'
};

print(coastCol.getVideoThumbURL(gifParams));

// Add the first image of the collection to the map.
Map.centerObject(roi, 10);
Map.addLayer(coastCol.first(), {}, 'Coastline Change Animation');

// Optionally, export the animation as a video.

// Add styled vectors to map

Map.addLayer(coastalChange, {}, 'Coastalline change');
Map.addLayer(coastlineVector, {}, 'Coastline (Vector)');
Map.centerObject(roi,10)
// Create legend to show the coastline year
var panel = ui.Panel([ui.Label('Coastline change')], ui.Panel.Layout.flow('vertical'), { position: 'bottom-left' });
vis.coast_class_values.map(function(value, index){
  panel.add(ui.Panel(
    [
      ui.Label('', { width: '30px', height: '20px', backgroundColor: vis.coast_class_palette[index] }),
      ui.Label(value, { height: '20px' })
    ], 
    ui.Panel.Layout.flow('horizontal')
  ));
});
Map.add(panel);
// exporting data in csv format to drive

var years = ee.List.sequence(2002,2023)

var coastCol = ee.ImageCollection(years.map(function(year){
  year = ee.Number(year);
  var start, end, landsat;
  
  if (year.lt(2014)) {
    start = ee.Date.fromYMD(year.subtract(1), 1, 1);
    end = ee.Date.fromYMD(year.add(1), 12, 31);
    landsat = landsat457;
  } else {
    start = ee.Date.fromYMD(year, 1, 1);
    end = ee.Date.fromYMD(year, 12, 31);
    landsat = landsat89;
  }
  var date = [start, end];
  var image = landsat(roi, date).multiply(0.0000275).add(-0.2);
  var ndwi = image.normalizedDifference(['B3', 'B5']).rename('NDWI');
  var land = ndwi.lt(0.1).selfMask();
  
  return land.set('year', year);
}));


