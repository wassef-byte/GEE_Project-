//Dataset
var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED"),
    l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2"),
    l4 = ee.ImageCollection("LANDSAT/LT04/C02/T1_L2"),
    l5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2"),
    l7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2"),
    l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"),
    srtm = ee.Image("USGS/SRTMGL1_003"),
    M16 = ee.ImageCollection("MODIS/061/MCD12Q1");

// Define the bounding box for Tunisia
var tunisia = ee.Geometry.Rectangle([7.5, 32.0, 11.5, 37.5]);

// Center the map on Tunisia
Map.centerObject(tunisia, 6); // Adjust the zoom level as needed


// Main UI Panel setup
var mainPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical', true),  // Vertical layout for main panel
  style: {width: '450px', padding: '20px'}
});
ui.root.add(mainPanel);

// Title
var titleLabel = ui.Label({
  value: 'Tunisia',
  style: {fontWeight: 'bold', fontSize: '30px', color: 'red'}
});
mainPanel.add(titleLabel);

// Date Inputs
var startLabel = ui.Label({ value: 'Start date' });
mainPanel.add(startLabel);

var startDateText = ui.Textbox({ value: '2022-01-01', placeholder: 'Start date' });
mainPanel.add(startDateText);

var endLabel = ui.Label({ value: 'End date' });
mainPanel.add(endLabel);

var endDateText = ui.Textbox({ value: '2022-12-31', placeholder: 'End date' });
mainPanel.add(endDateText);

// Cloud Filter
var cloudLabel = ui.Label({ value: 'Cloud filter' });
mainPanel.add(cloudLabel);

var cloudSlider = ui.Slider({
  value: 20,
  min: 0,
  max: 100,
  style: {width: '300px'}
});
mainPanel.add(cloudSlider);

// Red, Green, Blue Selectors (Band Panel)
var sentinelBands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12'];
var landsatBands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];
var modisBands = ['LC_Type1'];
var landCoverInfoList = [
  {name: 'Evergreen Needleleaf Forests: dominated by evergreen conifer trees (canopy >2m). Tree cover >60%.', color: '#05450a'},  // Class 1
  {name: 'Evergreen Broadleaf Forests: dominated by evergreen broadleaf and palmate trees (canopy >2m). Tree cover >60%.', color: '#086a10'},  // Class 2
  {name: 'Deciduous Needleleaf Forests: dominated by deciduous needleleaf (larch) trees (canopy >2m). Tree cover >60%.', color: '#54a708'},  // Class 3
  {name: 'Deciduous Broadleaf Forests: dominated by deciduous broadleaf trees (canopy >2m). Tree cover >60%.', color: '#78d203'},  // Class 4
  {name: 'Mixed Forests: dominated by neither deciduous nor evergreen (40-60% of each) tree type (canopy >2m). Tree cover >60%.', color: '#009900'},  // Class 5
  {name: 'Closed Shrublands: dominated by woody perennials (1-2m height) >60% cover.', color: '#c6b044'},  // Class 6
  {name: 'Open Shrublands: dominated by woody perennials (1-2m height) 10-60% cover.', color: '#dcd159'},  // Class 7
  {name: 'Woody Savannas: tree cover 30-60% (canopy >2m).', color: '#dade48'},  // Class 8
  {name: 'Savannas: tree cover 10-30% (canopy >2m).', color: '#fbff13'},  // Class 9
  {name: 'Grasslands: dominated by herbaceous annuals (<2m).', color: '#b6ff05'},  // Class 10
  {name: 'Permanent Wetlands: permanently inundated lands with 30-60% water cover and >10% vegetated cover.', color: '#27ff87'},  // Class 11
  {name: 'Croplands: at least 60% of area is cultivated cropland.', color: '#c24f44'},  // Class 12
  {name: 'Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt and vehicles.', color: '#a5a5a5'},  // Class 13
  {name: 'Cropland/Natural Vegetation Mosaics: mosaics of small-scale cultivation 40-60% with natural tree, shrub, or herbaceous vegetation.', color: '#ff6d4c'},  // Class 14
  {name: 'Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.', color: '#69fff8'},  // Class 15
  {name: 'Barren: at least 60% of area is non-vegetated barren (sand, rock, soil) areas with less than 10% vegetation.', color: '#f9ffa4'},  // Class 16
  {name: 'Water Bodies: at least 60% of area is covered by permanent water bodies.', color: '#1c0dff'}  // Class 17
];

var bandPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true)
});
mainPanel.add(bandPanel);

var redSelect = ui.Select({
  value: 'B4',
  items: sentinelBands
});
bandPanel.add(redSelect);

var greenSelect = ui.Select({
  value: 'B3',
  items: sentinelBands
});
bandPanel.add(greenSelect);

var blueSelect = ui.Select({
  value: 'B2',
  items: sentinelBands
});
bandPanel.add(blueSelect);

// Image stretch sliders (Stretch Panel)
var stretchPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true)
});
mainPanel.add(stretchPanel);

var redSlider = ui.Slider({
  value: 2000,
  min: 0,
  max: 20000,
});
stretchPanel.add(redSlider);

var greenSlider = ui.Slider({
  value: 2000,
  min: 0,
  max: 20000,
});
stretchPanel.add(greenSlider);

var blueSlider = ui.Slider({
  value: 2000,
  min: 0,
  max: 20000,
});
stretchPanel.add(blueSlider);

// Satellite Selector
var satelliteLabel = ui.Label({ value: 'Select Satellite' });
mainPanel.add(satelliteLabel);

var satelliteSelect = ui.Select({
  items: ['Sentinel-2H', 'Landsat','Dynamic World','MODIS','SRTM'],
    placeholder: 'Select Satellite',
  onChange: function(selectedSatellite) {
    // Automatically hide the panel when switching to non-MODIS data
    if (selectedSatellite !== 'MODIS') {
      hideLandCoverPanel();
       // Hide panel if the user switches from MODIS
    }
     if (selectedSatellite !== 'Dynamic World') {
      hideLandCoverPanel0();  // Hide panel if the user switches from MODIS
    }
    
      
  },
  style: {width: '300px'}
  
});
mainPanel.add(satelliteSelect);

// Button Panel Setup
// Generate Composite button centered
var compositeButtonPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true),  // Horizontal layout to center the button
  style: {
    padding: '10px 0',
    width: '450px',
    margin: '10px 0',
  }
});
mainPanel.add(compositeButtonPanel);

// Button to generate composite
var compositeButton = ui.Button({
  label: 'Generate Composite!',
    style: {
    backgroundColor: 'lightblue',
    color: 'black',
    padding: '5px',
    fontWeight: 'bold',
    width: '200px',
    margin: '0 auto'} , // Center button by giving it auto margins
  onClick: function() {
    // Logic for generating the composite
    generateComposite();  // Call the generateComposite function

    // Check current satellite selection
    var selectedSatellite = satelliteSelect.getValue(); // Get the selected satellite
    if (selectedSatellite === 'MODIS') {
      showLandCoverPanel();  // Show panel for MODIS if it is selected
    } else if(selectedSatellite === 'Dynamic World') {
      showLandCoverPanel0();// Hide panel if any other satellite is selected
  }
}});
compositeButtonPanel.add(compositeButton);

// Export and SRTM buttons side by side
var bottomButtonPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true),  // Horizontal layout for the buttons
  style: {
    padding: '10px 0',
    backgroundColor: '#f4f4f4',  // Background to make the button panel visually stand out
    border: '1px solid #ccc',
    width: '450px',
  }
});
mainPanel.add(bottomButtonPanel);

// Export Composite button
var exportButton = ui.Button({
  label: 'Export Composite',
  onClick: exportComposite,
  style: {
    backgroundColor: 'green',
    color: 'red',
    padding: '5px',
    fontWeight: 'bold',
    width: '50%',  // Set to 50% of the button panel width
    margin: '0'    // Remove margin to ensure they sit next to each other
  }
});
bottomButtonPanel.add(exportButton);

// Create a new panel to hold the MODIS export button, centered below the existing buttons
var modisButtonPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true),  // Center the MODIS button horizontally
  style: {
    padding: '10px 0',
    backgroundColor: '#f4f4f4',  // Same background for consistency
    border: '1px solid #ccc',
    width: '450px',
    textAlign: 'center'
  }
});
mainPanel.add(modisButtonPanel);


// MODIS Export button
var exportMODISButton = ui.Button({
  label: 'Export MODIS',
  style: {
    backgroundColor: 'green',
    color: 'red',
    padding: '5px',
    fontWeight: 'bold',
    width: '100%',  // Full width for a centered look
    margin: '0'    // No margin to fit the panel neatly
  },
  onClick: function() {
    var year = parseInt(startDateText.getValue().split('-')[0], 10); 
    var modisClipped = ee.ImageCollection('MODIS/061/MCD12Q1')
      .filter(ee.Filter.calendarRange(year, year, 'year'))
      .select('LC_Type1')
      .mean()
      .clip(roi);

    Export.image.toDrive({
      image: modisClipped,
      description: 'MODIS_LC_Type1_Export',
      scale: 500,
      region: roi,
      fileFormat: 'GeoTIFF',
      maxPixels: 1e13
    });
    notifyUser('Exporting MODIS data to Google Drive...', 'green');
  }
});
modisButtonPanel.add(exportMODISButton);

// SRTM download button
var downloadSRTMButton = ui.Button({
  label: 'Export SRTM',
  style: {
    backgroundColor: 'green',
    color: 'red',
    padding: '5px',
    fontWeight: 'bold',
    width: '50%',  // Set to 50% of the button panel width
    margin: '0'    // Remove margin to ensure they sit next to each other
  },
  onClick: function() {
    var Dem = srtm.clip(roi);
    if (Dem) {
      Export.image.toDrive({
        image: Dem,
        description: 'SRTM_Export',
        scale: 30,
        region: roi,
        fileFormat: 'GeoTIFF',
        maxPixels: 1e13
      });
      notifyUser('Exporting SRTM data to Google Drive...', 'green');
    } else {
      notifyUser('SRTM data not available for export.', 'red');
    }
  }
});
bottomButtonPanel.add(downloadSRTMButton);

// Function to update visibility based on dataset selection
function updateEndDateFields() {
  var dataset = satelliteSelect.getValue();
  if (dataset === 'MODIS' ) {
    // Hide or disable the 'End date' label and textbox
    endLabel.style().set('shown', false);  // Hides the label
    endDateText.setDisabled(true);  // Disables the textbox
    endDateText.setValue(null);  // Sets value to null (optional)
  } else {
    // Show or enable the 'End date' label and textbox for other datasets
    endLabel.style().set('shown', true);  // Shows the label
    endDateText.setDisabled(false);  // Enables the textbox
    endDateText.setValue('2022-12-31');  // Restores the original value (optional)
  }
}





// Function to update the notification label
var notificationLabel = ui.Label('');
mainPanel.add(notificationLabel);

function notifyUser(message, color) {
  notificationLabel.setValue(message);
  notificationLabel.style().set({
    color: color || 'black',
    fontWeight: 'bold',
    padding: '8px',
    backgroundColor: 'lightgray'
  });
}
var CLASS_NAMES = [
    'plan deau', 'foret', 'herbe', 'végétation inondée', 'cultures',
    'arbustes et broussailles', 'zone urbaine', 'sol nu', 'neige et glace'
];

var VIS_PALETTE = [
    '419bdf', '397d49', '88b053', '7a87c6', 'e49635', 'dfc35a', 'c4281b',
    'a59b8f', 'b39fe1'
];

// Create an array of objects with name and color fields
var classColorList = [];
for (var i = 0; i < CLASS_NAMES.length; i++) {
    classColorList.push({
        name: CLASS_NAMES[i],
        color: '#' + VIS_PALETTE[i]  // Add the '#' for hex color
    });
}
var landCoverPanel0 ;
// Function to create the info panel
function createLandCoverPanelDynamicWorld() {
    var infoPanel = ui.Panel({
      layout: ui.Panel.Layout.flow('vertical'),
      style: {
        position: 'bottom-left',  // Position in the bottom left corner
        width: '300px',
        height: '200px',  // Set a fixed height for scrolling
        padding: '8px',
        backgroundColor: 'white',
        border: '1px solid black',
      }
    });

    // Add title
    infoPanel.add(ui.Label({
      value: 'Land Cover Types',
      style: {fontSize: '16px', fontWeight: 'bold'}
    }));

    // Add each land cover type with its color
    classColorList.forEach(function(info) {
        var label = ui.Label({
          value: info.name,  // Use info.name
          style: {
            backgroundColor: info.color,  // Use info.color
            color: 'white',
            padding: '10px',
            margin: '2px 0',
            width: '100%',  // Make the label full width
            textAlign: 'left'  // Align the text to the left
          }
        });
        infoPanel.add(label);
    });

    // Add the panel to the map
    Map.add(infoPanel);
    
    return infoPanel;  // Return the panel
}



var landCoverPanel;  // Declare a variable to store the panel
// Function to create the info panel
function createLandCoverPanel() {
    var infoPanel = ui.Panel({
      layout: ui.Panel.Layout.flow('vertical'),
      style: {
        position: 'bottom-left',  // Position in the bottom left corner
        width: '300px',
        height: '200px',  // Set a fixed height for scrolling
        padding: '8px',
        backgroundColor: 'white',
        border: '1px solid black',
      }
    });

    // Add title
    infoPanel.add(ui.Label({
      value: 'Land Cover Types',
      style: {fontSize: '16px', fontWeight: 'bold'}
    }));

    // Add each land cover type with its color
    landCoverInfoList.forEach(function(info) {
        var label = ui.Label({
          value: info.name,
          style: {
            backgroundColor: info.color,
            color: 'white',
            padding: '4px',
            margin: '2px 0'
          }
        });
        infoPanel.add(label);
    });

    // Add the panel to the map
    Map.add(infoPanel);
    
    return infoPanel;  // Return the panel
}

// Global variable for SRTM data
var srtmClipped = null; // Initialize to null
// Define MODIS bands
var modisBands = ['LC_Type1'];  // Define the MODIS band(s) of interest
var satellite = null;
// Update band selections based on satellite
function updateBandSelection() {
  var satellite = satelliteSelect.getValue();
  var year = parseInt(startDateText.getValue().split('-')[0], 10); 
  
  // Clear previous layers
  Map.layers().reset();  
  
  if (satellite === 'Sentinel-2H') {
    // Update band selection for Sentinel-2
    redSelect.items().reset(sentinelBands);
    greenSelect.items().reset(sentinelBands);
    blueSelect.items().reset(sentinelBands);
    redSelect.setValue('B4');
    greenSelect.setValue('B3');
    blueSelect.setValue('B2');

  } else if (satellite === 'Landsat') {
    // Update band selection for Landsat
    redSelect.items().reset(landsatBands);
    greenSelect.items().reset(landsatBands);
    blueSelect.items().reset(landsatBands);
    redSelect.setValue(landsatBands[3]); // Default to B4
    greenSelect.setValue(landsatBands[2]); // Default to B3
    blueSelect.setValue(landsatBands[1]); // Default to B2

  } else if (satellite === 'SRTM') {
     redSelect.items().reset(null);
     greenSelect.items().reset(null);
     blueSelect.items().reset(null);
    
     redSelect.setValue(null);
     greenSelect.setValue(null);
     blueSelect.setValue(null);
    // Clip the SRTM data to the region of interest
    var srtmClipped = srtm.clip(roi);
    
    // Visualization parameters for SRTM
    var srtmVisParams = {min: 0, max: 3000, palette: ['0000FF', '00FF00', 'FFFF00', 'FF0000']};
    
    // Add the SRTM layer to the map
    Map.addLayer(srtmClipped, srtmVisParams, 'SRTM Elevation');
    Map.centerObject(srtmClipped, 10);  // Center the map on SRTM
    notifyUser('SRTM layer added to the map.', 'blue');

  } else if (satellite === 'MODIS') {
    redSelect.items().reset(modisBands);
    greenSelect.items().reset(null);
    blueSelect.items().reset(null);
   
    // Set redSelect to 'LC_Type1' and clear greenSelect and blueSelect
    redSelect.setValue('LC_Type1');
    greenSelect.setValue(null);
    blueSelect.setValue(null);
    
  }else if (satellite === 'Dynamic World') {
    redSelect.items().reset(null);
    greenSelect.items().reset(null);
    blueSelect.items().reset(null);
    
    redSelect.setValue(null);
    greenSelect.setValue(null);
    blueSelect.setValue(null);
  
}}


// Call the update function when the satellite selection changes
satelliteSelect.onChange(updateBandSelection);
satelliteSelect.onChange(updateEndDateFields);
// Function to show the panel on the map
function showLandCoverPanel0() {
    // If the panel has not been created yet, create it
    if (!landCoverPanel0) {
        landCoverPanel0 = createLandCoverPanelDynamicWorld();
    }
}

// Function to hide the panel from the map
function hideLandCoverPanel0() {
    // If the panel exists, remove it from the map
    if (landCoverPanel0) {
        Map.remove(landCoverPanel0);
         landCoverPanel0 = null;
    }
}

// Function to show the panel when MODIS is selected
function showLandCoverPanel() {
  if (!landCoverPanel) {
    landCoverPanel = createLandCoverPanel();
  }}

// Function to hide the panel when other satellites are selected
function hideLandCoverPanel() {
  if (landCoverPanel) {
    Map.remove(landCoverPanel);
    landCoverPanel = null;
  }
}

// Load Level 1 (ADM1) and Level 2 (ADM2) datasets
var gaulLevel1 = ee.FeatureCollection('FAO/GAUL/2015/level1');
var gaulLevel2 = ee.FeatureCollection('FAO/GAUL/2015/level2');

// Filter for Tunisia only in both level 1 and level 2 datasets
var tunisiaGaulLevel1 = gaulLevel1.filter(ee.Filter.eq('ADM0_NAME', 'Tunisia'));
var tunisiaGaulLevel2 = gaulLevel2.filter(ee.Filter.eq('ADM0_NAME', 'Tunisia'));

// Get unique administrative names for ADM1 (first-level administrative units)
var adminNames1 = tunisiaGaulLevel1.aggregate_array('ADM1_NAME').distinct().getInfo();

// Global variables
var roi = null;  // Region of interest (ROI)
var currentLevel = 'ADM1';  // Track whether we're selecting ADM1 or ADM2
var analysis ;
var roiCopy;
// Create the UI dropdown to select administrative units (starting with ADM1)
var adminSelect = ui.Select({
  items: adminNames1,  // Start with ADM1 names
  placeholder: 'Select an Administrative Unit (ADM1)',
  style: {width: '300px'}
});
// Button to set ROI based on selected administrative unit
var selectROIBtn = ui.Button({
  label: 'Set ROI (ADM1)',  // Initial label for ADM1
  onClick: function() {
    var selectedAdmin = adminSelect.getValue();  // Get the selected value (ADM1 or ADM2)

    if (currentLevel === 'ADM1' && selectedAdmin) {
      // If selecting ADM1, update to show ADM2 options
      updateADM2Options(selectedAdmin);  // Fetch ADM2 options for the selected ADM1
      currentLevel = 'ADM2';  // Switch to ADM2 selection mode
      selectROIBtn.setLabel('Set ROI (ADM2)');  // Update button label
      adminSelect.setPlaceholder('Select ADM2 within ' + selectedAdmin);  // Update placeholder
    } else if (currentLevel === 'ADM2' && selectedAdmin) {
      // If selecting ADM2, set the ROI
       setROI(selectedAdmin);
       resetToInitialState();
       
    } else {
      print('Please make a selection.');  // Notification in the console
    }
  },
  style: {
    backgroundColor: 'orange',
    color: 'black',
    padding: '5px',
    fontWeight: 'bold',
    width: '200px'
  }
});
resetToInitialState()
// Function to update ADM2 options based on selected ADM1
function updateADM2Options(selectedAdmin1) {
  // Filter for ADM2 names based on selected ADM1
  var filteredADM2 = tunisiaGaulLevel2
    .filter(ee.Filter.eq('ADM1_NAME', selectedAdmin1))  // Filter by selected ADM1
    .aggregate_array('ADM2_NAME')  // Get unique ADM2 names
    .distinct()
    .getInfo();
  
  // Check if ADM2 names are being fetched correctly
  print('ADM2 Names for ' + selectedAdmin1 + ':', filteredADM2);

  // Reset the adminSelect dropdown and update with ADM2 options
  adminSelect.items().reset(filteredADM2.length > 0 ? filteredADM2 : ['No ADM2 available']);
}

// Function to reset the UI to its initial state
function resetToInitialState() {
  currentLevel = 'ADM1';  // Revert to ADM1 selection mode
  adminSelect.items().reset(adminNames1.length > 0 ? adminNames1 : ['No ADM1 available']);
  selectROIBtn.setLabel('Set ROI (ADM1)');  // Reset button label
  adminSelect.setPlaceholder('Select an Administrative Unit (ADM1)');  // Reset placeholder
  adminSelect.setValue(null);  // Clear selected value in dropdown
}
// Function to set ROI
function setROI(selectedAdmin) {
  var selectedFeature = tunisiaGaulLevel2
    .filter(ee.Filter.eq(currentLevel === 'ADM2' ? 'ADM2_NAME' : 'ADM1_NAME', selectedAdmin))
    .first();
  
  roi = selectedFeature.geometry();  // Set the ROI as the geometry of the first matching feature
  roiCopy = roi ;
  // Clear previous layers and add the new ROI to the map
  Map.clear();
  Map.centerObject(roi);
  Map.addLayer(roi, {color: 'blue'}, 'Selected ROI');

  // Create an instance of the Analysis class using roi
  analysis = new Analysis(roi);  // Now analysis uses the selected ROI
}

// Example of how to add the dropdown and button to the main panel
mainPanel.add(adminSelect);
mainPanel.add(selectROIBtn);

// Create the panel for toggling analysis
var runButtonPanel = ui.Panel({
layout: ui.Panel.Layout.flow('vertical'),  // Use vertical layout to assist centering
  style: {
    backgroundColor: 'lightblue',
    padding: '-2px ',
    width: '85px',    // Full width to allow for proper centering
    margin: '0 auto',
    textAlign: 'center' // Ensures content is centered within the panel
  }
});

//Create a UI panel to display charts
// Define the chart panel
var chartPanel = ui.Panel({style: {width: '300px',}});
ui.root.add(chartPanel);

// Initially hide the chart panel
chartPanel.style().set('shown', false);


// Chart panel to show the generated charts
var chartPanel1 = ui.Panel({
  style: {
    backgroundColor: 'lightBlue',
    color: 'red',
    padding: '5px',
    fontWeight: 'bold',
    width: '300px',  // Set to desired width
    margin: '0 auto', // Center the chart panel
    shown: false      // Initially hide the chart panel
  }
});

// Index selection
var indexLabel = ui.Label('Index:');
var indexSelect = ui.Select({
  items: ['NDVI', 'EVI', 'SAVI', 'NDWI', 'NBR', 'NDMI'],
  placeholder: 'Select index',
  value: 'NDVI'
});

// Start and end year selection
var startYearLabel = ui.Label('Start Year:');
var startYearInput = ui.Textbox({value: '2015'});

var endYearLabel = ui.Label('End Year:');
var endYearInput = ui.Textbox({value: '2016'});
 
// Monthly checkbox
var monthlyCheckbox = ui.Checkbox({label: 'Monthly', value: true});
var smallBox;
// Create a Select widget for analysis options
var analysisSelect = ui.Select({
  items: ['Analysis', 'Factors', 'Indices'],
  value: 'Analysis', // Default value                                  
  onChange: function (selected) {                              
    if (selected === 'Analysis'){removeSmallBoxFromMap();analysis.clearMapAndPanel();chartPanel.style().set('shown', false);}
    if (selected === 'Factors') {
      if (chartPanel.style().get('shown')) {
        // Hide the chart panel
        chartPanel.style().set('shown', false);
      } else {
        // Show the chart panel
        chartPanel.style().set('shown', true);
      }

      if (analysis && analysis.layersVisible) {
        analysis.clearMapAndPanel();
        analysis.layersVisible = false;
      } else {
        if (!analysis) {
          print('Please set the ROI first.');
          return; // Exit if analysis is not defined
        }

        // Precipitation data (CHIRPS)
        var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY');
        var yearlyPrecipitation = analysis.loadYearlyData(chirps, 'sum');
        var sumPrecipitation = analysis.aggregateSum(chirps);

        // Temperature data (MODIS LST as proxy for temperature)
        var modisTemp = ee.ImageCollection('MODIS/061/MOD11A1').select('LST_Day_1km');
        var yearlyTemperature = analysis.loadYearlyData(modisTemp, 'mean');
        var sumTemperature = analysis.aggregateSum(modisTemp);

        // Population data (WorldPop)
        var population = ee.ImageCollection('WorldPop/GP/100m/pop');
        var yearlyPopulation = analysis.loadYearlyData(population, 'mean');
        var sumPopulation = analysis.aggregateSum(population);

        // NO2 Emissions (TROPOMI)
        var no2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2').select('tropospheric_NO2_column_number_density');
        var yearlyNO2 = analysis.loadYearlyData(no2, 'mean');
        var sumNO2 = analysis.aggregateSum(no2);

        // Land Burn data (MODIS Fire)
        var landBurn = ee.ImageCollection('MODIS/061/MCD64A1').select('BurnDate');
        var yearlyLandBurn = analysis.loadYearlyData(landBurn, 'sum');
        var sumLandBurn = analysis.aggregateSum(landBurn);

        // CO Emissions (TROPOMI)
        var co2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO')
          .select('CO_column_number_density') // Select the CO band
          .filter(ee.Filter.date('2002-01-01', '2023-12-31')); // Filter by date range

        // Aggregate CO emissions over the years (mean CO density)
        var yearlyCO2 = co2.mean().clip(roi); // Clip to region of interest

        // Visualization parameters for CO data
        var visParamsCO2 = { min: 0, max: 0.05, palette: ['blue', 'green', 'yellow', 'orange', 'red'] };

        // Add CO emissions layer to the map
        Map.addLayer(yearlyCO2, visParamsCO2, 'Summed CO (CO2 Proxy) Emissions (2002-2023)');

        // Export CO data
        Export.image.toDrive({
          image: yearlyCO2,
          description: 'Summed_CO_Emissions_2002_2023',
          region: roi,
          scale: 1000,
          maxPixels: 1e12,
          fileFormat: 'GeoTIFF'
        });

        // Filter CO2 data by year range
        var co2Filtered = co2.filter(ee.Filter.calendarRange(2002, 2023, 'year'));

        // Reduce CO2 data to yearly means
        var yearlyCO2Series = ee.List.sequence(2002, 2023).map(function (year) {
          year = ee.Number(year); // Ensure the year is a number

          // Filter the collection to a specific year and reduce to the mean CO2 density
          var annualCO2 = co2Filtered
            .filter(ee.Filter.calendarRange(year, year, 'year'))
            .mean()
            .reduceRegion({
              reducer: ee.Reducer.mean(),
              geometry: roi,
              scale: 1000,
              maxPixels: 1e12
            })
            .set('year', year); // Set the year as a property

          return ee.Feature(null, annualCO2);
        });

        // Create a feature collection from the yearly data
        var yearlyCO2Collection = ee.FeatureCollection(yearlyCO2Series);

        // Create a chart for CO2 emissions over the years
        var co2Chart = ui.Chart.feature.byFeature({
          features: yearlyCO2Collection,
          xProperty: 'year',
          yProperties: ['CO_column_number_density'] // Correct property name for CO2
        }).setOptions({
          title: 'Yearly Carbon Monoxide (CO) Density (2002-2023)',
          vAxis: { title: 'CO Density (mol/m²)' },
          hAxis: { title: 'Year' },
          series: {
            0: { color: 'red' }
          }
        });

        // Export summed images for all datasets
        analysis.exportSummedImage(sumPrecipitation, 'Sum_Precipitation_2002_2023');
        analysis.exportSummedImage(sumTemperature, 'Sum_Temperature_2002_2023');
        analysis.exportSummedImage(sumPopulation, 'Sum_Population_2002_2023');
        analysis.exportSummedImage(sumNO2, 'Sum_NO2_2002_2023');
        analysis.exportSummedImage(sumLandBurn, 'Sum_LandBurn_2002_2023');

        // Visualization parameters
        var visParamsPrecip = { min: 0, max: 2000, palette: ['blue', 'green', 'yellow', 'orange', 'red'] };
        var visParamsTemp = { min: 13000, max: 16000, palette: ['blue', 'green', 'yellow', 'orange', 'red'] };
        var visParamsPop = { min: 0, max: 500, palette: ['white', 'green', 'yellow', 'orange', 'red'] };
        var visParamsNO2 = { min: 0, max: 0.0001, palette: ['black', 'purple', 'blue', 'green', 'yellow', 'red'] };
        var visParamsLandBurn = { min: 0, max: 366, palette: ['black', 'yellow', 'red'] };

        // Add the summed images to the map as layers
        analysis.addLayerToMap(sumPrecipitation, 'Summed Precipitation (2002-2023)', visParamsPrecip);
        analysis.addLayerToMap(sumTemperature, 'Summed Temperature (2002-2023)', visParamsTemp);
        analysis.addLayerToMap(sumPopulation, 'Summed Population (2002-2023)', visParamsPop);
        analysis.addLayerToMap(sumNO2, 'Summed NO2 Emissions (2002-2023)', visParamsNO2);
        analysis.addLayerToMap(sumLandBurn, 'Summed Burned Land (2002-2023)', visParamsLandBurn);

        // Generate and display time-series charts
        var precipChart = analysis.createTimeSeriesChart(yearlyPrecipitation, 'Yearly Precipitation Sum', 'Precipitation (mm)');
        var tempChart = analysis.createTimeSeriesChart(yearlyTemperature, 'Yearly Temperature Average', 'Temperature (Kelvin)');
        var popChart = analysis.createTimeSeriesChart(yearlyPopulation, 'Yearly Population Sum', 'Population');
        var no2Chart = analysis.createTimeSeriesChart(yearlyNO2, 'Yearly NO2 Emissions Sum', 'NO2 Emissions');
        var landBurnChart = analysis.createTimeSeriesChart(yearlyLandBurn, 'Yearly Burned Area Sum', 'Burned Area');

        // Add charts to chart panel
        chartPanel.clear();
        chartPanel.add(precipChart);
        chartPanel.add(tempChart);
        chartPanel.add(popChart);
        chartPanel.add(no2Chart);
        chartPanel.add(landBurnChart);
        chartPanel.add(co2Chart);

        analysis.layersVisible = true; // Update state
      }
    } else if (selected === 'Indices') {
    createChartPanel();
    addSmallBoxToMap();
    
}}});

function generateMonthlyIndices(roi, index, monthly, startYear, endYear) {
  // Define start and end dates
  var start = ee.Date.fromYMD(startYear, 1, 1);
  var end = ee.Date.fromYMD(endYear + 1, 1, 1);

  // Choose the correct Landsat collection based on the year
  var collection = (startYear <= 2012) ? landsat457I(roi, [start, end]) : landsat89I(roi, [start, end]);

  // Define the variable that will hold the ImageCollection to return
  var indexCollection;

  if (monthly) {
    // Generate monthly indices
    var months = ee.List.sequence(1, 12);
    var monthlyIndices = ee.ImageCollection.fromImages(
      ee.List.sequence(startYear, endYear).map(function(y) {
        return months.map(function(m) {
          var monthStart = ee.Date.fromYMD(y, m, 1);
          var monthEnd = monthStart.advance(1, 'month');
          var monthlyCollection = collection.filterDate(monthStart, monthEnd);
          var monthlyComposite = monthlyCollection.median();
          var indexImage = indexFunctionLandsat(monthlyComposite, index);
          return indexImage.set('year', y).set('month', m).set('system:time_start', monthStart);
        });
      }).flatten() // Flatten the nested lists
    );

    // Assign the monthlyIndices to indexCollection
    indexCollection = monthlyIndices;

    // Create and display the monthly chart
    var monthlyChart = ui.Chart.image.series({
      imageCollection: monthlyIndices,
      region: roi,
      reducer: ee.Reducer.mean(),
      scale: 30,
      xProperty: 'system:time_start'
    }).setOptions({
      title: 'Monthly ' + index + ' for ' + startYear + ' to ' + endYear,
      hAxis: { title: 'Month' },
      vAxis: { title: index + ' Value' }
    });

    // Clear previous chart and add new chart to the chart panel
    chartPanel2.clear(); // Clear the previous chart
    chartPanel2.add(monthlyChart); // Add the new chart

  } else {
    // Generate yearly indices
    var yearlyIndices = ee.ImageCollection.fromImages(
      ee.List.sequence(startYear, endYear).map(function(y) {
        var yearStart = ee.Date.fromYMD(y, 1, 1);
        var yearEnd = yearStart.advance(1, 'year');
        var yearlyCollection = collection.filterDate(yearStart, yearEnd);
        var yearlyComposite = yearlyCollection.median();
        var indexImage = indexFunctionLandsat(yearlyComposite, index);
        return indexImage.set('year', y).set('system:time_start', yearStart);
      })
    );

// Add the yearly index layers to the map and export them
ee.List.sequence(startYear, endYear).evaluate(function(years) {
  years.forEach(function(year) {
    var yearStart = ee.Date.fromYMD(year, 1, 1);
    var yearlyCollection = collection.filterDate(yearStart, yearStart.advance(1, 'year'));
    var yearlyComposite = yearlyCollection.median();
    var indexImage = indexFunctionLandsat(yearlyComposite, index);
    
    // Add the layer to the map for visualization (optional)
    Map.addLayer(indexImage, {min: -1, max: 1, palette: ['blue', 'white', 'green']}, index + ' ' + year);
    
  });
});

    // Create and display the yearly chart
    var yearlyChart = ui.Chart.image.series({
      imageCollection: yearlyIndices,
      region: roi,
      reducer: ee.Reducer.mean(),
      scale: 30,
      xProperty: 'system:time_start'
    }).setOptions({
      title: 'Yearly ' + index + ' for ' + startYear + ' to ' + endYear,
      hAxis: { title: 'Year' },
      vAxis: { title: index + ' Value' }
    });

    // Clear previous chart and add new chart to the chart panel
    chartPanel2.clear(); // Clear the previous chart
    chartPanel2.add(yearlyChart); // Add the new chart
  }

  // Return the appropriate collection (monthly or yearly)
  return indexCollection;
}


// Style for the Select widget
analysisSelect.style({

    width: '300px',     // Set specific width for the select widget
    margin: '0 auto',   // Center the select horizontally
    padding: '5px',
    backgroundColor: 'lightBlue',
    color: 'red',
    fontWeight: 'bold'
});
runButtonPanel.add(analysisSelect);
// Add the panel to the main panel
mainPanel.add(runButtonPanel);


// Chart panel to show the generated charts
var chartPanel2 = ui.Panel({
  style: {
    backgroundColor: 'lightBlue',
    color: 'red',
    padding: '5px',
    fontWeight: 'bold',
    width: '300px',  // Set to desired width
    margin: '0 auto', // Center the chart panel
    shown: false      // Initially hide the chart panel
  }
});

// Function to create the chart panel and add it to the main panel
function createChartPanel() {
  // Add chartPanel2 to the main panel
  ui.root.add(chartPanel2);
}
//function to remove chart panel from the main panel 
function removeChartPanel(){
  ui.root.remove(chartPanel2)
}
// Global reference for the smallBox
var smallBox = null;

// Function to create the small box UI for generating indices 
function createSmallBox() {
    // Define labels and inputs for the UI
    var indexLabel = ui.Label('Index:');
    var indexSelect = ui.Select({
      items: ['NDVI', 'EVI', 'SAVI', 'NDWI', 'NBR', 'NDMI','NDBI'],
      placeholder: 'Select index',
      value: 'NDVI'
    });
    
    // Start and end year selection
    var startYearLabel = ui.Label('Start Year:');
    var startYearInput = ui.Textbox({value: '2015'});
    
    var endYearLabel = ui.Label('End Year:');
    var endYearInput = ui.Textbox({value: '2016'});

    // Monthly checkbox
    var monthlyCheckbox = ui.Checkbox({label: 'Monthly', value: true});
  
    // Export checkbox
    var exportCheckbox = ui.Checkbox('Export to Drive');
    
    // Create a small box panel
    var smallBox = ui.Panel({
        layout: ui.Panel.Layout.flow('vertical'),
        style: {
            position: 'bottom-left',  // Position in the bottom-left corner
            width: '300px',
            height: '250px',  // Set a fixed height for scrolling
            padding: '8px',
            backgroundColor: 'white',
            border: '1px solid black',
        }
    });

    // Add UI components to the small box
    smallBox.add(indexLabel);
    smallBox.add(indexSelect);
    smallBox.add(startYearLabel);
    smallBox.add(startYearInput);
    smallBox.add(endYearLabel);
    smallBox.add(endYearInput);
    smallBox.add(monthlyCheckbox);
    smallBox.add(exportCheckbox);

    // Create and add a toggle button for generating indices
    var toggleButton = ui.Button({
        label: 'Generate Indices',
        onClick: function() {
            var label = toggleButton.getLabel();
            if (label === 'Generate Indices') {
                var index = indexSelect.getValue();
                var monthly = monthlyCheckbox.getValue();
                var startYear = parseInt(startYearInput.getValue());
                var endYear = parseInt(endYearInput.getValue());
                var exportChekbox = exportCheckbox.getValue();
                if (isNaN(startYear) || isNaN(endYear)) {
                    print('Please enter valid start and end years.');
                    return;
                }

                // Call the function to generate indices (assuming this is defined elsewhere)
                var indexCollection = generateMonthlyIndices(roi, index, monthly, startYear, endYear);

                // Check if the export checkbox is selected
                if (exportCheckbox) {
                    // Export logic (assuming indexCollection is already set up)
                  // Add the yearly index layers to the map and export them
                ee.List.sequence(startYear, endYear).evaluate(function(years) {
                  years.forEach(function(year) {
                    var yearStart = ee.Date.fromYMD(year, 1, 1);
                    var start = ee.Date.fromYMD(startYear, 1, 1);
                    var end = ee.Date.fromYMD(endYear + 1, 1, 1);
                      // Choose the correct Landsat collection based on the year
                    var collection = (startYear <= 2012) ? landsat457I(roi, [start, end]) : landsat89I(roi, [start, end]);
                    var yearlyCollection = collection.filterDate(yearStart, yearStart.advance(1, 'year'));
                    var yearlyComposite = yearlyCollection.median();
                    var indexImage = indexFunctionLandsat(yearlyComposite, index)
                            Export.image.toDrive({
                                image: indexImage,
                                description: index + '_' + year + '_export',
                                folder: 'EarthEngineExports',
                                fileNamePrefix: index + '_' + year,
                                scale: 30,
                                region: roi,  // Assuming roi is your region of interest
                                maxPixels: 1e13
                            });
                        });
                    });
                }

                // Update button label to "End Analysis"
                toggleButton.setLabel('End Analysis');

                // Show the chart panel if hidden
                chartPanel2.style().set('shown', true);

                // Store the collection for export use
                smallBox.indexCollection = indexCollection;
            } else {
                // Hide the chart panel and reset button label
                chartPanel2.style().set('shown', false);
                toggleButton.setLabel('Generate Indices');
                chartPanel2.clear();
            }
        }
    });

    // Add the toggle button to the small box
    smallBox.add(toggleButton);

    // Return the small box for reference
    return smallBox;
}


// Function to add the small box to the map
function addSmallBoxToMap() {
    if (smallBox) {
        // If the smallBox already exists, remove it first before adding it again
        Map.remove(smallBox); 
    }
    smallBox = createSmallBox(); // Create the small box
    Map.add(smallBox); // Add the small box to the UI
}

// Function to remove the small box from the map
function removeSmallBoxFromMap() {
    if (smallBox) { // Only remove if it exists
        Map.remove(smallBox); // Remove the small box from the UI
        smallBox = null; // Reset the reference to null
    } else {
        print('No small box to remove.');
    }
}



// Filter and composite functions for Landsat and Sentinel
function filterCol(col, roi, date) {
  return col.filterDate(date[0], date[1]).filterBounds(roi);
}

function landsat457(roi, date) {
  var col = filterCol(l4, roi, date).merge(filterCol(l5, roi, date)).merge(filterCol(l7, roi, date));
  return col.map(cloudMaskTm1).mean().clip(roi);
}

function landsat89(roi, date) {
  var col = filterCol(l8, roi, date).merge(filterCol(l9, roi, date));
  return col.map(cloudMaskOli1).mean().clip(roi);
}

function sentinel2(roi, date) {
  var col = filterCol(s2, roi, date).filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', cloudSlider.getValue()));
  return col.mean().clip(roi);
}

// Cloud Masking functions for Landsat
function cloudMaskTm1(image) {
  var qa = image.select('QA_PIXEL');
  var dilated = 1 << 1;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  return image.updateMask(mask);
}
// Cloud Masking functions for Landsat
function cloudMaskTm(image) {
  var qa = image.select('QA_PIXEL');
  var dilated = 1 << 1;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  return image.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'], ['B2', 'B3', 'B4', 'B5', 'B6', 'B7']).updateMask(mask);
}
function cloudMaskOli1(image) {
  var qa = image.select('QA_PIXEL');
  var dilated = 1 << 1;
  var cirrus = 1 << 2;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cirrus).eq(0))
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  return image.updateMask(mask);
}

function cloudMaskOli(image) {
  var qa = image.select('QA_PIXEL');
  var dilated = 1 << 1;
  var cirrus = 1 << 2;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cirrus).eq(0))
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  return image.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'], ['B2', 'B3', 'B4', 'B5', 'B6', 'B7']).updateMask(mask);
}
// Function to calculate indices for Landsat
var indexFunctionLandsat = function(image, index) {
  var bandMap = {
    BLUE: "B2",    // Corrected to string band names
    GREEN: "B3",   // Corrected to string band names
    RED: "B4",     // Corrected to string band names
    NIR: "B5",     // Corrected to string band names
    SWIR1: "B6",   // Corrected to string band names
    SWIR2: "B7"    // Corrected to string band names
  };

  // NDVI: Normalized Difference Vegetation Index
  var ndvi = image.normalizedDifference([bandMap.NIR, bandMap.RED]).rename('NDVI');
  
  // EVI: Enhanced Vegetation Index
  var evi = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': image.select(bandMap.NIR),
      'RED': image.select(bandMap.RED),
      'BLUE': image.select(bandMap.BLUE)
    }).rename('EVI');
    
  // NDWI: Normalized Difference Water Index
  var ndwi = image.normalizedDifference([bandMap.GREEN, bandMap.NIR]).rename('NDWI');
  
  // SAVI: Soil Adjusted Vegetation Index
  var savi = image.expression(
    '((NIR - RED) / (NIR + RED + L)) * (1 + L)', {
      'NIR': image.select(bandMap.NIR),
      'RED': image.select(bandMap.RED),
      'L': 0.5  // Soil brightness correction factor
    }).rename('SAVI');
    
  // NBR: Normalized Burn Ratio
  var nbr = image.normalizedDifference([bandMap.NIR, bandMap.SWIR2]).rename('NBR');
  
  // NDMI: Normalized Difference Moisture Index
  var ndmi = image.normalizedDifference([bandMap.NIR, bandMap.SWIR1]).rename('NDMI');
  
  // NDBI: Normalized Difference Built-up Index (NEW)
  var ndbi = image.normalizedDifference([bandMap.SWIR1, bandMap.NIR]).rename('NDBI');
  
  // Return the requested index
  return index === 'NDVI' ? ndvi :
         index === 'EVI' ? evi :
         index === 'NDWI' ? ndwi :
         index === 'SAVI' ? savi :
         index === 'NBR' ? nbr :
         index === 'NDMI' ? ndmi :
         index === 'NDBI' ? ndbi : null;  // Return NDBI if requested
};


/// Function to filter
function filterCol2(col, roi, date){
  return col.filterDate(date[0], date[1]).filterBounds(roi);
}

// Composite function
function landsat457I(roi, date){
  var col = filterCol2(l4, roi, date).merge(filterCol2(l5, roi, date)).merge(filterCol2(l7, roi, date));
  var image = col.map(cloudMaskTm)
                 .map(function(img){return img.clip(roi)});
  return image;
}

function landsat89I(roi, date){
  var col = filterCol2(l8, roi, date).merge(filterCol2(l9, roi, date));
  var image = col.map(cloudMaskOli)
                 .map(function(img){return img.clip(roi)});
  return image;
}
var composite = null;

// Generate Composite based on user inputs
function generateComposite() {
  Map.layers().reset();  // Reset map layers
  var start, end, visParams;
  composite = null;  // Reset the composite variable

  // Get user inputs
  var satellite = satelliteSelect.getValue();
  var startDate = startDateText.getValue();
  var endDate = endDateText.getValue();
  
  // Parse the year, month, and day for startDate
  var startDateParts = startDate.split('-');
  var startYear = parseInt(startDateParts[0]);
  var startMonth = parseInt(startDateParts[1]);
  var startDay = parseInt(startDateParts[2]);

  if (satellite === 'MODIS') {
    // For MODIS, only use the start year, ignoring the endDate
    var modis = ee.ImageCollection('MODIS/061/MCD12Q1')
                   .filter(ee.Filter.calendarRange(startYear, startYear, 'year'))  // Filter by the selected year
                   .select('LC_Type1');  // Explicitly select LC_Type1

    // Clip the MODIS data to the region of interest (roi)
    var modisClipped = modis.mean().clip(roi);

    // Visualization parameters for MODIS
    var igbpLandCoverVis = {
      min: 1.0,
      max: 17.0,
      palette: [
        '05450a', '086a10', '54a708', '78d203', '009900', 
        'c6b044', 'dcd159', 'dade48', 'fbff13', 'b6ff05', 
        '27ff87', 'c24f44', 'a5a5a5', 'ff6d4c', '69fff8', 
        'f9ffa4', '1c0dff'
      ],
    };

    // Add the MODIS layer to the map
    Map.addLayer(modisClipped, igbpLandCoverVis, 'MODIS LC_Type1 (' + startYear + ')');
    Map.centerObject(modisClipped, 10);  // Adjust the zoom level as needed
    notifyUser('MODIS LC_Type1 layer added to the map.', 'green');
    return;  // Exit the function as MODIS doesn't use the common visParams
  }

  // Parse the year, month, and day for the endDate (for non-MODIS datasets)
  var endDateParts = endDate.split('-');
  var endYear = parseInt(endDateParts[0]);
  var endMonth = parseInt(endDateParts[1]);
  var endDay = parseInt(endDateParts[2]);

  // Define start and end dates for the composite for non-MODIS datasets
  start = ee.Date.fromYMD(startYear, startMonth, startDay);
  end = ee.Date.fromYMD(endYear, endMonth, endDay);
  if(satellite === 'Dynamic World'){
    // Load Dynamic World land cover dataset
      var dwCol = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
        .filterDate(startDate, endDate)
        .filterBounds(roi);
      
      // Select the most recent image in the collection
      var dwImage = dwCol.median().clip(roi);
      composite = dwImage;
      // Define land cover class names
      var CLASS_NAMES = [
        "water", "trees", "grass", "flooded_vegetation", "crops",
        "shrub_and_scrub", "urban", "bare_ground", "snow_and_ice"
      ];
      
      // Define visualization color palette for land cover classes
      var VIS_PALETTE = [
        '419BDF', '397D49', '88B053', '7A87C6', 'E49635', 'DFC35A', 'C4281B', 'A59B8F', 'B1F7FF'
      ];
      
      // Visualize the 'label' band (land cover)
      var landCoverVis = dwImage.select('label').visualize({
        min: 0, 
        max: 8,  // Dynamic World has 9 classes, so the max value is 8
        palette: VIS_PALETTE
      });
      
      // Load the Digital Elevation Model (DEM) for hillshade calculation
      var dem = ee.Image('USGS/SRTMGL1_003').clip(roi);
      
      // Generate the hillshade from the DEM
      var hillshade = ee.Terrain.hillshade(dem);
      // Combine the land cover visualization with the hillshade
      var landCoverHillshade = landCoverVis.multiply(hillshade.divide(255));
      // Add the DEM hillshade layer for reference
      Map.addLayer(hillshade, {min: 0, max: 255}, 'Hillshade');
      // Add the land cover with hillshade effect to the map
      Map.addLayer(landCoverHillshade, {}, 'Dynamic World Land Cover with Hillshade');
    // Center the map over the region of interest
      Map.centerObject(roi, 11);
    
  }
  // Create composite for Landsat and Sentinel-2
  if (satellite === 'Landsat') {
    // Landsat logic
    if (startYear < 2014) {
      composite = landsat457(roi, [start, end]);  // Assign composite
    } else {
      composite = landsat89(roi, [start, end]);  // Assign composite
    }
  } else if (satellite === 'Sentinel-2H') {
    // Sentinel-2 logic
    composite = sentinel2(roi, [start, end]);  // Assign composite
  }

  // If the composite is not null (for Sentinel-2 or Landsat), apply visualization
  if (composite && satellite != 'Dynamic World' ) {
    visParams = {
      bands: [redSelect.getValue(), greenSelect.getValue(), blueSelect.getValue()],
      min: 0,
      max: [redSlider.getValue(), greenSlider.getValue(), blueSlider.getValue()]
    };

    // Add the layer to the map
    Map.addLayer(composite, visParams, 'Composite (' + startDate + ' to ' + endDate + ')');
    Map.centerObject(composite, 10);  // Adjust the zoom level as needed
  }

  // Notify user that the composite has been generated
  notifyUser('Composite has been generated successfully.', 'green');
  return composite;
}

// Function to export the composite with all bands
function exportComposite() {
  var satellite = satelliteSelect.getValue();
  var startDate = startDateText.getValue();
  var endDate = endDateText.getValue();
  
  var exportName = satellite + '_Composite_' + startDate + '_to_' + endDate;

  // Set the appropriate scale based on the satellite
  var exportScale = (satellite === 'Sentinel-2') ? 10 : 30;

  if (composite) {
    // List of band names to export individually (change this based on your image)
    var bands = composite.bandNames().getInfo();  // This will automatically retrieve all bands in the composite

    // Loop over each band and export it separately
    bands.forEach(function(band) {
      Export.image.toDrive({
        image: composite.select([band]),  // Select the individual band
        description: 'Export_' + band,  // Task name in GEE and file prefix
        folder: 'GEE_Exports',  // Folder in Google Drive where the exports will be saved
        fileNamePrefix: exportName + '_' + band,  // File name prefix for each export
        scale: exportScale,  // Set the export scale (resolution) in meters
        region: roi,  // Define the region of interest (ROI) for the export
        maxPixels: 1e13,  // Max number of pixels to handle large exports
        fileFormat: 'GeoTIFF'  // Export format (GeoTIFF)
      });
    });

    // Notify user that the export has started
    notifyUser('Export to Google Drive has been initiated.', 'green');
  } else {
    notifyUser('Please generate a composite first before exporting.', 'red');
  }
}

var Analysis = function(aoi) {
  this.aoi = aoi;  // Area of interest
  this.startDate = '2002-01-01';
  this.endDate = '2023-12-31';
  this.years = ee.List.sequence(2002, 2023);  // Years sequence
  this.layersVisible = false; // State to track if layers are visible
};


// Method to load yearly data for a given image collection and operation
Analysis.prototype.loadYearlyData = function(imageCollection, operation) {
  var aoi = this.aoi; // Use the class property directly
  return ee.ImageCollection(this.years.map(function(year) {
    var start = ee.Date.fromYMD(year, 1, 1);
    var end = start.advance(1, 'year');
    var yearData = imageCollection.filterDate(start, end)[operation]();
    return yearData.clip(aoi).set('year', year).set('system:time_start', start);
  }));
};

// Method to aggregate data over a period using a sum
Analysis.prototype.aggregateSum = function(collection) {
  return collection.filterDate(this.startDate, this.endDate).sum().clip(this.aoi);
};

// Method to create time-series charts for each dataset
Analysis.prototype.createTimeSeriesChart = function(imageCollection, title, yAxisLabel) {
  return ui.Chart.image.series({
    imageCollection: imageCollection,
    region:roi, // Use getter method for clarity
    reducer: ee.Reducer.sum(),
    scale: 5000,
    xProperty: 'system:time_start'
  }).setOptions({
    title: title,
    hAxis: {title: 'Year'},
    vAxis: {title: yAxisLabel},
    lineWidth: 2,
    pointSize: 3
  });
};

// Method to export summed images to Google Drive
Analysis.prototype.exportSummedImage = function(image, description) {
  Export.image.toDrive({
    image: image.clip(this.aoi),  // Clip the image to the area of interest (ROI)
    description: description,
    folder: 'DL',  // Change folder name if needed
    scale: 5000,
    region:roiCopy ,  // Define the region of interest (ROI) for the export
    maxPixels: 1e13,
    crs: 'EPSG:4326'
  });
};

// Method to clear all layers and charts from the map and panel
Analysis.prototype.clearMapAndPanel = function() {
  Map.clear();  // Clear all map layers
  chartPanel.clear();  // Clear the chart panel
};
// Method to add datasets as layers on the map
Analysis.prototype.addLayerToMap = function(image, name, visParams) {
  Map.addLayer(image.clip(this.aoi), visParams, name); // Clip the image to the aoi to ensure it has a geometry
};