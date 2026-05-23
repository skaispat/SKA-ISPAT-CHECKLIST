const fs = require('fs');
const path = require('path');
const dir = 'd:/SKAIspat/SKA-ISPAT-CHECKLIST/src/components/data';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // we want to replace `disabled={isSubmittingTask}` with `disabled={isSubmittingTask || tasks.some(t => selectedRows.has(t.task_id) && t.isUploading)}`
    // ONLY on the batch submit button.
    const btnRegex = /<button\s*onClick=\{handleBatchSubmit\}\s*disabled=\{isSubmittingTask\}/;
    if (btnRegex.test(content)) {
        content = content.replace(
            btnRegex,
            '<button\n                                onClick={handleBatchSubmit}\n                                disabled={isSubmittingTask || tasks.some(t => selectedRows.has(t.task_id) && t.isUploading)}'
        );
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
console.log('Done!');
