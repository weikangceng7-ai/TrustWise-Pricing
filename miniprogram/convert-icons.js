const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const tabbarDir = path.join(__dirname, 'src/static/tabbar');

const svgFiles = [
  'home.svg', 'home-active.svg',
  'enterprise.svg', 'enterprise-active.svg',
  'report.svg', 'report-active.svg',
  'chat.svg', 'chat-active.svg',
  'user.svg', 'user-active.svg'
];

async function convertSvgToPng(svgFile) {
  const svgPath = path.join(tabbarDir, svgFile);
  const pngFile = svgFile.replace('.svg', '.png');
  const pngPath = path.join(tabbarDir, pngFile);
  
  try {
    await sharp(svgPath)
      .resize(81, 81)
      .png()
      .toFile(pngPath);
    console.log(`✓ 已转换: ${svgFile} -> ${pngFile}`);
  } catch (error) {
    console.error(`✗ 转换失败 ${svgFile}:`, error.message);
  }
}

async function main() {
  console.log('开始转换 SVG 到 PNG...\n');
  
  for (const svgFile of svgFiles) {
    await convertSvgToPng(svgFile);
  }
  
  console.log('\n转换完成！');
}

main();
