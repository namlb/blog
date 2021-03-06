const fs = require('fs-extra');
const gm = require('gm');
const gulp = require('gulp');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const path = require('path');
const {generateRevisionedAsset} = require('./utils/assets');
const globby = require('globby');


const resizeImage = (filepath, width) => {
  return new Promise((resolve, reject) => {
    const imgType = path.extname(filepath).slice(1).toUpperCase();

    gm(filepath).resize(width).toBuffer(imgType, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer);
    });
  });
};


const minifyImageBuffer = (buffer) => {
  return imagemin.buffer(buffer, {plugins: [imageminPngquant()]});
};


const generateLowResArticleImages = (filenames) => {
  return Promise.all(filenames.map(async (filename) => {
    const resized = await resizeImage(filename, 700);
    const minified = await minifyImageBuffer(resized);

    return generateRevisionedAsset(path.basename(filename), minified);
  }));
};


const generateHighResArticleImages = (filenames) => {
  return Promise.all(filenames.map(async (filename) => {
    const resized = await resizeImage(filename, 1400);
    const minified = await minifyImageBuffer(resized);

    const extname = path.extname(filename);
    const basename = path.basename(filename, extname);
    const highResBasename = `${basename}-1400w${extname}`;

    return generateRevisionedAsset(highResBasename, minified);
  }));
};

const optimizeManifestImages = (filenames) => {
  return Promise.all(filenames.map(async (filename) => {
    const buffer = await fs.readFile(filename);
    const minified = await minifyImageBuffer(buffer);
    return generateRevisionedAsset(path.basename(filename), minified);
  }));
};


const generateRevisionedAssets = (filenames) => {
  return Promise.all(filenames.map(async (filename) => {
    const content = await fs.readFile(filename);
    return generateRevisionedAsset(path.basename(filename), content);
  }));
};

gulp.task('images', async () => {
  try {
    // Article screenshots.
    const articlePngFilenames = await globby('assets/images/articles/*.png');
    await generateLowResArticleImages(articlePngFilenames);
    await generateHighResArticleImages(articlePngFilenames);

    // Manifest images.
    const manifestPngFilenames = await globby('assets/images/*.png');
    await optimizeManifestImages(manifestPngFilenames);

    // GIF and SVG assets
    const svgFilenames = await globby('assets/images/**/*.+(gif|svg)');
    await generateRevisionedAssets(svgFilenames);
  } catch (err) {
    console.log(err.stack);
    console.log(err.stdout.toString());
    console.log(err.stderr.toString());
  }
});

