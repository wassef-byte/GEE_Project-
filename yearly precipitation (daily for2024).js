
var chrips0 =  ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY");
// Step 2: Load the CHIRPS daily precipitation dataset within a date range
var startDate = '2002-01-01'; // Adjust the start date
var endDate = '2023-12-31'; // Adjust the end date
var date = '2024-01-01';
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
               .map(function (chrips) {return chrips.clip(aoi)})
               .filterDate(startDate, endDate);
// Get the image using the parameter from CHIRPS collection

// Get the image using the parameter from CHIRPS collection
var precipitation = chrips0.filterDate(date).first().clip(aoi);

// Step 3: Aggregate data by year to get the sum of precipitation
var years = ee.List.sequence(2002, 2023);

var yearlyPrecipitation = ee.ImageCollection(years.map(function(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, 'year');
  var yearData = chirps.filterDate(start, end).sum();
  return yearData.set('year', year).set('system:time_start', start);
}));

// Step 4: Define visualization parameters
var visParams = {
  min: 300,
  max: 400, // Adjust this based on your data range
  palette: ['blue', 'cyan', 'green', 'red'] // Color palette representing different precipitation levels
};

// Step 5: Create a time-series chart of yearly precipitation sum
var chart = ui.Chart.image.series({
  imageCollection: yearlyPrecipitation,
  region: aoi,
  reducer: ee.Reducer.sum(),
  scale: 5000,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'Yearly Precipitation Sum Time Series',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Precipitation (mm)'},
  lineWidth: 2,
  pointSize: 3
});

// Step 6: Display the chart and map
print(chart);
Map.centerObject(aoi, 10);
Map.addLayer(yearlyPrecipitation, visParams, 'Yearly Precipitation Sum');
// Show the data
Map.addLayer(precipitation, { min: 0, max: 30, palette: ['red', 'yellow', 'green', 'cyan', 'blue', 'purple']});
// Download parameter
var params = {
  name: 'Yearly Precipitation Sum',
  crs: 'EPSG:4326',
  scale: 5000,
  region: aoi,
  filePerBand: false,
  format: 'GEO_TIFF'
};


// Create and print download url
precipitation.getDownloadURL(params, function(url, err){
  err ? print(err) : print(url);
});