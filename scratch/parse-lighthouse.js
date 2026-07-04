import fs from 'fs';

try {
  const rawData = fs.readFileSync('lighthouse-result.json', 'utf8');
  const result = JSON.parse(rawData);
  
  console.log("Accessibility Score:", result.categories.accessibility.score * 100);
  console.log("\nFailed Accessibility Audits:");
  
  const audits = result.audits;
  const accessibilityAuditIds = result.categories.accessibility.auditRefs.map(ref => ref.id);
  
  accessibilityAuditIds.forEach(id => {
    const audit = audits[id];
    if (audit && audit.score !== null && audit.score < 1) {
      console.log(`- [${id}] (Score: ${audit.score})`);
      console.log(`  Title: ${audit.title}`);
      console.log(`  Description: ${audit.description}`);
      if (audit.details && audit.details.items) {
        console.log(`  Elements: ${audit.details.items.length}`);
        audit.details.items.slice(0, 3).forEach(item => {
          if (item.node) {
            console.log(`    * Selector: ${item.node.selector} (Label: "${item.node.nodeLabel || ''}")`);
          }
        });
      }
      console.log();
    }
  });
} catch (err) {
  console.error("Error reading or parsing lighthouse-result.json:", err.message);
}
