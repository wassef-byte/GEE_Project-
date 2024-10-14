
  
// 3. Download the River data
var hydrobasins = ee.FeatureCollection("WWF/HydroSHEDS/v1/Basins/hybas_8");
var basin = hydrobasins.filter(ee.Filter.eq('HYBAS_ID', 1080031500));
var roi = basin.geometry();
var years = ee.List.sequence(2002,2023)
function filterCol(col, roi, date){
  return col.filterDate(date[0], date[1]).filterBounds(roi);
}

// 1. Import the Free Flowing Rivers Data
var river = ee.FeatureCollection("WWF/HydroSHEDS/v1/FreeFlowingRivers")
.filterBounds(roi);



// 1. Import the Free Flowing Rivers Data
var river = ee.FeatureCollection("WWF/HydroSHEDS/v1/FreeFlowingRivers")
.filterBounds(roi);

Map.centerObject(roi, 6);
//Map.addLayer(hydrobasins,{},'hydro');
// 2. Loads the JRC Global Surface Water dataset, which provides information about the occurrence of surface water on a global scale.
var gsw = ee.Image("JRC/GSW1_4/GlobalSurfaceWater");

// 3. Water Extraction and Clipping
// 3a. Extracts the geometry (boundary) of the selected basin.
var water = gsw.select('max_extent');
// 3b. Clips the water occurrence data to the extent of the selected basin  
var clipped = water.clip(roi)

// 4. Visualization of Water Occurrence
// Defines visualization parameters for displaying water occurrence, where 0 represents no water and 1 represents water presence. 
// It uses a palette from white (no water) to blue (water).
var visParams1 = {min:0, max:1, palette: ['white','blue']} ;


// 5. Data Processing: // Do unmask() to replace masked pixels with 0. This avoids extra pixels along the edges
var clipped = clipped.unmask(0); // Replaces masked pixels (where no data is available) with 0 to avoid extra pixels along the edges.

// 6. Perform a morphological closing to fill holes in waterbodies, enhancing the accuracy of water detection.
var waterProcessed = clipped
  .focal_max({
    'radius':30,
    'units': 'meters',
    'kernelType': 'square'})
  .focal_min({
    'radius':30,
    'units': 'meters',
    'kernelType': 'square'});
    
// 7. Vectorization of Water Bodies
// 7a. Converts the processed water occurrence image into vector polygons representing water bodies within the basin boundaries.
var vector = waterProcessed.reduceToVectors({
  reducer: ee.Reducer.countEvery(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10,
  eightConnected: false
});
// 7b. Defines visualization parameters for displaying the vectorized water bodies, setting the color to blue.
var visParams = {color: 'black',opacity:'0,5'};
Map.addLayer(vector, visParams, 'Surface Water Polygons'); 
Map.addLayer(clipped, visParams1, 'Surface Water', false);
//The GEE code extracts surface water information for a specific basin, processes the data to enhance accuracy, and visualizes it on the map. 
var startYear = 2015;
var endYear = 2021 ;

var startDate = ee.Date.fromYMD(startYear, 1, 1);
var endDate = ee.Date.fromYMD(endYear+1, 1, 1);
// get the list of years
var years = ee.List.sequence(ee.Date(startDate).get('year'), ee.Date(endDate).get('year'));

// Get the list of months
var months = ee.List.sequence(1, 12);

var CHIRPS = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');
var CHIRPS = CHIRPS.filterDate(startDate,endDate);
var mod16 = ee.ImageCollection('MODIS/006/MOD16A2')
              .select('ET');
var mod16 = mod16.filterDate(startDate , endDate);



// Load CHIRPS precipitation data
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY');

// Load MODIS ET data
var modisET = ee.ImageCollection('MODIS/006/MOD16A2')
  .select('ET')
  .map(function(image) {
    return image.multiply(0.1).copyProperties(image, ["system:time_start"]);
  });


// Define the main function to calculate the water balance
var WaterBalance = ee.ImageCollection.fromImages(
  years.map(function(y) {
    return months.map(function(m) {
      var P = chirps.filter(ee.Filter.calendarRange(y, y, 'year'))
        .filter(ee.Filter.calendarRange(m, m, 'month'))
        .sum();
      var ET = modisET.filter(ee.Filter.calendarRange(y, y, 'year'))
        .filter(ee.Filter.calendarRange(m, m, 'month'))
        .sum();
      var WB = P.subtract(ET).rename('waterbalance');
      return WB.set('year', y)
        .set('month', m)
        .set('system:time_start', ee.Date.fromYMD(y, m, 1));
    });
  }).flatten()
);

// Create a combined chart for the monthly water balance across all years
var waterBalanceMonthlyChart = ui.Chart.image.seriesByRegion({
  imageCollection: WaterBalance,  // Assuming WaterBalance is an image collection
  regions: roi,
  reducer: ee.Reducer.mean(),
  scale: 500,
  xProperty: 'system:time_start'
})
.setOptions({
  title: 'Combined Monthly Water Balance (Precipitation - ET) Across Years',
  vAxis: {title: 'Water Balance (mm)'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 3,
  colors: ['blue']  // Directly specifying the color
})
.setChartType('ColumnChart');  // Corrected 'columnChart' to 'ColumnChart'


var balancevis={min:0,max:8,palette:'red,orange,yellow,blue'};
Map.addLayer(WaterBalance.mean().clip(roi),balancevis,'Meanmonthlywaterbalance');
// 2. Add Rivers layer
Map.addLayer(river, {}, 'river');
// Print the chart to the console
print(waterBalanceMonthlyChart);

// Center the map on the AOI
Map.centerObject(roi, 10);