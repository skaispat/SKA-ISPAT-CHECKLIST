const fs = require('fs');
const path = require('path');
const dir = 'd:/SKAIspat/SKA-ISPAT-CHECKLIST/src/components/data';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let changed = false;

    // 1. Fix confirmBatchSubmit (setLoading(true) -> setIsSubmittingTask(true))
    const confirmBatchRegex = /const confirmBatchSubmit = async \(batchRemarks\) => \{\s*setLoading\(true\)/;
    if (confirmBatchRegex.test(content)) {
        content = content.replace(
            confirmBatchRegex,
            'const confirmBatchSubmit = async (batchRemarks) => {\n        setIsSubmittingTask(true)'
        );
        changed = true;
    }

    // 2. Fix Submit Button
    const btnRegex = /<button\s*onClick=\{handleBatchSubmit\}\s*className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary\/90 transition-all shadow-sm animate-in fade-in slide-in-from-right-2 whitespace-nowrap"\s*>\s*Submit \{selectedRows\.size\} Tasks\s*<\/button>/;
    if (btnRegex.test(content)) {
        const replacementBtn = `<button
                                onClick={handleBatchSubmit}
                                disabled={isSubmittingTask}
                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-all shadow-sm animate-in fade-in slide-in-from-right-2 whitespace-nowrap flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSubmittingTask && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isSubmittingTask ? 'Submitting...' : \`Submit \${selectedRows.size} Tasks\`}
                            </button>`;
        content = content.replace(btnRegex, replacementBtn);
        changed = true;
    }

    // 3. Fix Desktop Loading Buffer
    const deskLoadingRegex = /\{loading \? \(\s*<tr>\s*<td colSpan="15" className="px-4 py-8 text-center text-muted-foreground">\s*Loading data\.\.\.\s*<\/td>\s*<\/tr>\s*\)/;
    if (deskLoadingRegex.test(content)) {
        const replacementDesk = `{loading ? (
                                    <tr>
                                        <td colSpan="15" className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p className="text-sm font-medium text-muted-foreground">Loading data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                )`;
        content = content.replace(deskLoadingRegex, replacementDesk);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
console.log('Done!');
