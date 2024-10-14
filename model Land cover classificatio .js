//https://code.earthengine.google.com/a1da4d1a9f52d470d8de73e486fd7102(source code and aplication)

// Define the region of interest (ROI)
var roi = table.filter(ee.Filter.or(
    ee.Filter.eq('ADM1_NAME', 'Kairouan')
  ));
  Map.addLayer(roi, {}, 'ROI');
  
  // Cloud mask function for Landsat 8 and 9
  function cloudMask(image) {
    var qa = image.select('QA_PIXEL');
    var dilated = 1 << 1;
    var cirrus = 1 << 2;
    var cloud = 1 << 3;
    var shadow = 1 << 4;
    var mask = qa.bitwiseAnd(dilated).eq(0)
      .and(qa.bitwiseAnd(cirrus).eq(0))
      .and(qa.bitwiseAnd(cloud).eq(0))
      .and(qa.bitwiseAnd(shadow).eq(0));
    return image.select(['SR_B.*'], ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'])
      .updateMask(mask)
      .multiply(0.0000275)
      .add(-0.2);
  }
  
  // Function to create an image composite for a specific year
  function createComposite(year) {
    var startDate = ee.Date.fromYMD(year, 1, 1);
    var endDate = ee.Date.fromYMD(year, 12, 31);
  
    // Filter Landsat 8 and 9 collections for the year
    var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterBounds(roi)
      .filterDate(startDate, endDate);
    var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
      .filterBounds(roi)
      .filterDate(startDate, endDate);
  
    // Merge and apply cloud mask
    var image = l8.merge(l9).map(cloudMask).median().clip(roi);
    Map.addLayer(image, { min: [0.1, 0.05, 0.05], max: [0.4, 0.3, 0.2], bands: ['B5', 'B6', 'B7']}, 'Image ' + year);
    return image;
  }
  
  
  // Create image composites for 2013 and 2023
  var image2013 = createComposite(2013);
  var image2023 = createComposite(2023);
  
  // Band map for spectral indices
  var bandMap = {
    BLUE: image2023.select('B2'),
    GREEN: image2023.select('B3'),
    RED: image2023.select('B4'),
    NIR: image2023.select('B5'),
    SWIR1: image2023.select('B6'),
    SWIR2: image2023.select('B7')
  };
  
  // Add spectral indices
  var indices = ee.Image([
    { name: 'EVI', formula: '(2.5 * (NIR - RED)) / (NIR + 6 * RED - 7.5 * BLUE + 1)' },
    { name: 'NBR', formula: '(NIR - SWIR2) / (NIR + SWIR2)' },
    { name: 'NDMI', formula: '(NIR - SWIR1) / (NIR + SWIR1)' },
    { name: 'NDWI', formula: '(GREEN - NIR) / (GREEN + NIR)' },
    { name: 'NDBI', formula: '(SWIR1 - NIR) / (SWIR1 + NIR)' },
    { name: 'NDBaI', formula: '(SWIR1 - SWIR2) / (SWIR1 + SWIR2)' }
  ].map(function(dict) {
    return image2023.expression(dict.formula, bandMap).rename(dict.name);
  }));
  
  // Add indices and SRTM to both images
  image2013 = image2013.addBands(indices).addBands(srtm.clip(roi));
  image2023 = image2023.addBands(indices).addBands(srtm.clip(roi));
  
  // Define class values and names for classification
  var classValue = [1, 2, 3, 4, 5];
  var classNames = ['ZoneUrabine', 'Foret', 'eau', 'culture', 'solnu'];
  var classPalette = ['d63000','36c601','2b5dff','498b36','d8a53f'];
  var features = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'EVI', 'NBR', 'NDMI', 'NDWI', 'NDBI', 'NDBaI', 'elevation'];
  
  // Merge samples for different classes
  var samples = zonesurbaine.merge(foret).merge(eau).merge(culture).merge(solnu)
    .map(function(feat) { return feat.buffer(30); });
  
  // Split samples into training and testing datasets
  samples = ee.FeatureCollection(classValue.map(function(value) {
    var filtered = samples.filter(ee.Filter.eq('classvalue', value)).randomColumn();
    var train = filtered.filter(ee.Filter.lte('random', 0.8)).map(function(feat) { return feat.set('sample', 'train'); });
    var test = filtered.filter(ee.Filter.gt('random', 0.8)).map(function(feat) { return feat.set('sample', 'test'); });
    return train.merge(test);
  })).flatten();
  
  // Extract sample data from the image
  var extract = image2023.sampleRegions({
    collection: samples,
    scale: 30,
    properties: ['sample', 'classvalue']
  });
  
  // Split data into training and testing sets
  var train = extract.filter(ee.Filter.eq('sample', 'train'));
  var test = extract.filter(ee.Filter.eq('sample', 'test'));
  print('Train sample size', train.size());
  print('Test sample size', test.size());
  
  // Export the image to Google Drive
  Export.image.toDrive({
    image: image2023.toFloat(),
    scale: 30,
    maxPixels: 1e13,
    region: roi,
    crs: 'EPSG:4326',
    folder: 'DL',
    description: 'Landsat_Jambi_2023'
  });
  
  // Train a Random Forest model
  var model = ee.Classifier.smileRandomForest(300).train(train, 'classvalue', features);
  print(model.explain());
  
  // Test the model and print the confusion matrix
  var cm = test.classify(model, 'predicted').errorMatrix('classvalue', 'predicted');
  print('Confusion matrix', cm, 'Accuracy', cm.accuracy(), 'Kappa', cm.kappa());
  
  // Apply the model to classify 2023 and 2013 land cover
  var lc2023 = image2023.classify(model, 'lulc').clip(roi)
    .set('lulc_class_values', classValue, 'lulc_class_palette', classPalette);
  Map.addLayer(lc2023, {}, 'LULC 2023');
  
  var lc2013 = image2013.classify(model, 'lulc').clip(roi)
    .set('lulc_class_values', classValue, 'lulc_class_palette', classPalette);
  Map.addLayer(lc2013, {}, 'LULC 2013');
  