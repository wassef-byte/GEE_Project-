// dataset
var table = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2");

// Filter the dataset to select the 'Elkrib' administrative unit in ADM2_NAME
var region = table.filter(ee.Filter.eq('ADM2_NAME', 'Elkrib'));

// Add the filtered region to the map as the study area
Map.addLayer(region, {color: 'blue'}, 'Study Area');
Map.centerObject(region, 9);  // Center the map on the AOI

// Define the time period for analysis
var startYear = '2020-01-01';
var endYear = '2021-01-01';

// Load the Sentinel-1 Ground Range Detected (GRD) ImageCollection
var sentinel1Collection = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterDate(startYear, endYear)
  .filterBounds(region)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select('VV');
print('Sentinel-1 Collection:', sentinel1Collection);

// Separate images into ascending and descending passes
var ascendingPass = sentinel1Collection.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
var descendingPass = sentinel1Collection.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

// Calculate the monthly average for ascending and descending passes
var monthlySAR = ee.ImageCollection(ee.List.sequence(1, 12).map(function(month) {
  var ascendingMonthly = ascendingPass.filter(ee.Filter.calendarRange(month, month, 'month')).mean().rename('ascending');
  var descendingMonthly = descendingPass.filter(ee.Filter.calendarRange(month, month, 'month')).mean().rename('descending');
  var date = ee.Date.fromYMD(2020, month, 1);
  return ascendingMonthly.addBands(descendingMonthly)
    .set('system:time_start', date.millis())
    .set('system:index', date.format('YYYY-MM'));
}));
print('Monthly Averaged SAR Collection:', monthlySAR);

// Apply speckle filtering
var speckleFiltered = monthlySAR.map(function(image) {
  return image.focalMean(30, 'square', 'meters').copyProperties(image, image.propertyNames());
});

// Add SAR layers to the map, clipped to the AOI
Map.addLayer(speckleFiltered.select('ascending').toBands().clip(region), {}, 'Ascending SAR', false);
Map.addLayer(speckleFiltered.select('descending').toBands().clip(region), {}, 'Descending SAR', false);

// Define a point for time-series analysis and add it to the map
var timeSeriesPoint = ee.Geometry.Point([ 9.17049 ,36.32425]);
Map.addLayer(timeSeriesPoint, {color: 'red'}, 'Time Series Point');

// Time-series chart of SAR backscatter values at the specified point
print(
  ui.Chart.image.series({
    imageCollection: speckleFiltered,
    region: timeSeriesPoint,
    reducer: ee.Reducer.mean(),
    scale: 10,
    xProperty: 'system:time_start'
  })
  .setOptions({
    title: 'SAR Backscatter Time Series',
    vAxis: {title: 'Backscatter (dB)'},
    hAxis: {title: 'Date'},
    lineWidth: 1,
    pointSize: 4
  })
);

// Export the ascending SAR images to Google Drive
Export.image.toDrive({
  image: speckleFiltered.select('ascending').toBands().clip(region),
  description: 'SAR_Ascending',
  scale: 30,
  region: region.geometry(),
  maxPixels: 1e13,
  crs: 'EPSG:4326',
  folder: 'Crop_Type_Analysis_Ascending'
});

// Export the descending SAR images to Google Drive
Export.image.toDrive({
  image: speckleFiltered.select('descending').toBands().clip(region),
  description: 'SAR_Descending',
  scale: 30,
  region: region.geometry(),
  maxPixels: 1e13,
  crs: 'EPSG:4326',
  folder: 'Crop_Type_Analysis_Descending'
});
