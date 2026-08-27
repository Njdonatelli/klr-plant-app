const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.resolve(__dirname, '..', '.robot', '2608251400_KLR_plant_master_catalog.xlsx');
const jsonPath = path.resolve(__dirname, '..', 'src', 'data', 'plants.base.json');

console.log('Loading Excel file...');
const workbook = xlsx.readFile(excelPath);
const sheetName = 'All Plants';
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log('Loading JSON file...');
const plantsJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Creating lookup map...');
// Create a map using lowercased common name (and potentially botanical name) for reliable matching
const excelMap = new Map();
for (const row of data) {
    const commonName = (row['common name'] || '').toString().trim().toLowerCase();
    const botanicalName = (row['botanical name'] || '').toString().trim().toLowerCase();
    const imageUrl = row['image url'] ? row['image url'].toString().trim() : null;
    const description = row['product description (scraped)'] ? row['product description (scraped)'].toString().trim() : null;
    
    if (commonName) {
        excelMap.set(commonName, { imageUrl, description });
    }
}

let updatedCount = 0;

for (const plant of plantsJson) {
    const commonName = (plant.commonName || '').toLowerCase().trim();
    if (excelMap.has(commonName)) {
        const { imageUrl, description } = excelMap.get(commonName);
        
        if (imageUrl) {
            plant.imageUrl = imageUrl;
        }
        
        if (description) {
            plant.description = description;
        }
        
        updatedCount++;
    } else {
        // console.log(`Warning: Could not find matching excel row for JSON plant: ${plant.commonName}`);
    }
}

console.log(`Updated ${updatedCount} plants with description and/or image urls.`);

fs.writeFileSync(jsonPath, JSON.stringify(plantsJson, null, 2));
console.log('Successfully wrote to plants.base.json');
