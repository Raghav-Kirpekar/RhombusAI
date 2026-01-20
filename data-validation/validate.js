const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const inputPath = process.argv[2] || path.join(__dirname, 'input.csv');
const outputPath = process.argv[3] || path.join(__dirname, 'output.csv');

if (!fs.existsSync(inputPath) || !fs.existsSync(outputPath)) {
    console.error('Error: Input or Output file not found.');
    console.error(`Input: ${inputPath}`);
    console.error(`Output: ${outputPath}`);
    process.exit(1);
}

console.log(`Validating ${path.basename(outputPath)} against ${path.basename(inputPath)}...`);

try {
    const inputContent = fs.readFileSync(inputPath, 'utf-8');
    const outputContent = fs.readFileSync(outputPath, 'utf-8');

    const inputRecords = parse(inputContent, { columns: true, skip_empty_lines: true });
    const outputRecords = parse(outputContent, { columns: true, skip_empty_lines: true });

    console.log(`Input Rows: ${inputRecords.length}`);
    console.log(`Output Rows: ${outputRecords.length}`);

    // 1. Schema Check
    const inputHeaders = Object.keys(inputRecords[0] || {});
    const outputHeaders = Object.keys(outputRecords[0] || {});
    console.log('Schema Check:');
    console.log('Input Cols:', inputHeaders);
    console.log('Output Cols:', outputHeaders);

    if (outputHeaders.length < inputHeaders.length) {
        console.warn('WARNING: Output has fewer columns than input.');
    }

    // 2. Data Cleaning Validation (Example: Check for duplicates removal)
    // Assuming the prompt was "remove duplicates"
    const distinctOutputRows = new Set(outputRecords.map(r => JSON.stringify(r))).size;
    if (distinctOutputRows === outputRecords.length) {
        console.log('PASS: No duplicate rows found in output.');
    } else {
        console.warn(`WARNING: Output contains ${outputRecords.length - distinctOutputRows} duplicates.`);
    }

    console.log('Validation Complete.');

} catch (err) {
    console.error('Validation Failed:', err.message);
    process.exit(1);
}
