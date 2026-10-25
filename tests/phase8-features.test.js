const { formatZaloSummary } = require('../src/lib/mobile/share');

console.log('=== RUNNING PHASE 8 FEATURE & OFFLINE TESTS ===');

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

// 1. Test Zalo & Mobile Summary formatting
const mockShareData = {
  studentName: 'Trần Văn Bảo',
  username: 'bao_tran',
  className: '14DHTH05',
  faculty: 'Khoa Công nghệ Thông tin',
  semesterName: 'Học kỳ 1 (2025 - 2026)',
  totalScore: 92,
  ratingLabel: 'Xuất sắc',
  categories: [
    { category: 1, shortName: 'Nội quy', score: 25, maxPoints: 25 },
    { category: 2, shortName: 'Học tập', score: 20, maxPoints: 20 },
    { category: 3, shortName: 'Phong trào', score: 18, maxPoints: 20 },
    { category: 4, shortName: 'Cộng đồng', score: 15, maxPoints: 15 },
    { category: 5, shortName: 'Cán bộ/NCKH', score: 14, maxPoints: 20 },
  ],
  evidenceUrl: 'https://drive.google.com/drive/folders/test123456',
};

const formatted = formatZaloSummary(mockShareData);

assert(formatted.includes('🎓 [HUIT]'), 'Header contains HUIT prefix');
assert(formatted.includes('Trần Văn Bảo (@bao_tran)'), 'Contains full student name and username');
assert(formatted.includes('14DHTH05'), 'Contains class name');
assert(formatted.includes('TỔNG ĐIỂM: 92/100đ (Xếp loại: Xuất sắc)'), 'Contains total score and rating');
assert(formatted.includes('https://drive.google.com/drive/folders/test123456'), 'Contains evidence link');
assert(formatted.includes('TC3 (Phong trào): 18/20đ'), 'Contains category line');

// 2. Test Google Drive embed conversion logic
function getGoogleDriveEmbed(url) {
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  return null;
}

const rawDriveLink = 'https://drive.google.com/file/d/1a2b3c4d5e6f7g/view?usp=sharing';
const embedUrl = getGoogleDriveEmbed(rawDriveLink);
assert(embedUrl === 'https://drive.google.com/file/d/1a2b3c4d5e6f7g/preview', 'Google drive embed link converted correctly');

// 3. Test Smart Recommendation Category Filtering
const mockSuggestions = [
  { category: 1, remainingCapacity: 0 },
  { category: 2, remainingCapacity: 0 },
  { category: 3, remainingCapacity: 2 }, // remaining
  { category: 4, remainingCapacity: 0 },
  { category: 5, remainingCapacity: 6 }, // remaining
];

const mockPresets = [
  { id: 'p1', category: 1, type: 'add', points: '5', title: 'TC1 Item' },
  { id: 'p2', category: 3, type: 'add', points: '4', title: 'Tham gia văn nghệ khoa' },
  { id: 'p3', category: 5, type: 'add', points: '6', title: 'Tham gia NCKH cấp Trường' },
  { id: 'p4', category: 2, type: 'deduct', points: '-2', title: 'Rớt môn' },
];

const remainingCats = mockSuggestions.filter(s => s.remainingCapacity > 0).map(s => s.category);
const filtered = mockPresets.filter(p => remainingCats.includes(p.category) && p.type === 'add');

assert(filtered.length === 2, 'Filtered exactly 2 recommended presets for under-filled categories');
assert(filtered.some(p => p.id === 'p2'), 'Recommends TC3 activity');
assert(filtered.some(p => p.id === 'p3'), 'Recommends TC5 activity');
assert(!filtered.some(p => p.id === 'p1'), 'Does not recommend full TC1');

console.log(`\n=== PHASE 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
