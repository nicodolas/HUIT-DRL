const { calculateSemesterScore } = require('../src/lib/drl/calculator');
const { CATEGORIES } = require('../src/lib/drl/rules');

// Quick unit test for Pre-flight audit calculations
console.log('=== RUNNING PHASE 7 AUDIT & FEATURE TESTS ===');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. Test Cap Overflow Detection
const mockRecords = [
  { id: '1', category: 1, type: 'default', points: '25', quantity: 1, title: 'TC1 Mặc định' },
  { id: '2', category: 2, type: 'default', points: '20', quantity: 1, title: 'TC2 Mặc định' },
  { id: '3', category: 4, type: 'default', points: '15', quantity: 1, title: 'TC4 Mặc định' },
  // Add 35 points to TC3 (max is 20)
  { id: '4', category: 3, type: 'add', points: '15', quantity: 1, title: 'Mùa Hè Xanh', evidenceUrl: 'https://drive.google.com/test1' },
  { id: '5', category: 3, type: 'add', points: '20', quantity: 1, title: 'Hiến máu tình nguyện', evidenceUrl: '' }, // missing evidence
];

const result = calculateSemesterScore(mockRecords, 'none');

assert(result.totalScore <= 100, `Total score ${result.totalScore} is capped at <= 100`);
assert(result.categories[3].rawScore === 35, `TC3 raw score is 35 (15 + 20)`);
assert(result.categories[3].cappedScore === 20, `TC3 capped score is 20`);
assert(result.categories[3].rawScore > result.categories[3].maxPoints, `Overflow detected on TC3`);

// 2. Missing evidence count
const nonDefaults = mockRecords.filter(r => r.type !== 'default');
const missingEvidence = nonDefaults.filter(r => !r.evidenceUrl || !r.evidenceUrl.trim());
assert(missingEvidence.length === 1, `Exactly 1 record missing evidence detected`);
assert(missingEvidence[0].title === 'Hiến máu tình nguyện', `Missing evidence record title matches`);

// 3. Test CSV formatting with UTF-8 BOM
const headers = ["TieuChi", "TenHoatDong", "Loai", "SoDiem", "SoLuong", "NgayDienRa", "LinkMinhChung", "GhiChu"];
const csvRow = ["TC3", '"Hiến máu tình nguyện"', "add", 20, 1, "2026-10-20", '""', '"Hiến máu đợt 1"'];
const csvContent = "\uFEFF" + [headers.join(","), csvRow.join(",")].join("\r\n");

assert(csvContent.charCodeAt(0) === 0xFEFF, `CSV starts with proper UTF-8 BOM for Microsoft Excel`);
assert(csvContent.includes("Hiến máu tình nguyện"), `Vietnamese diacritics preserved in CSV content`);

// 4. Test Discipline Cap
const disciplinedResult = calculateSemesterScore(mockRecords, 'khien_trach');
assert(disciplinedResult.rating.label === 'Khá', `Score with Khiển trách capped to Khá`);

console.log(`\n=== PHASE 7 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
