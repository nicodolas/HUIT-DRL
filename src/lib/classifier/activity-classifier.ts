/**
 * HUIT Decision 3385/QĐ-DCT Smart Activity Classifier Engine
 * Maps colloquial student activity titles/descriptions to official regulation criteria, points, and recognized evidence.
 */

export interface ActivityClassificationResult {
  matchedCategory: 1 | 2 | 3 | 4 | 5;
  suggestedPoints: number;
  confidence: "high" | "medium" | "low";
  matchedRule: string;
  matchedPresetCode?: string;
  categoryName: string;
  requiredProofGuide: string;
  explanation: string;
}

interface ClassifierRule {
  category: 1 | 2 | 3 | 4 | 5;
  points: number;
  ruleCode: string;
  presetCode?: string;
  keywords: string[];
  proofGuide: string;
  explanation: string;
}

const CLASSIFIER_RULES: ClassifierRule[] = [
  // --- TIÊU CHÍ 1: Ý thức chấp hành pháp luật & nội quy ---
  {
    category: 1,
    points: -5,
    ruleCode: "Điều 4 Khoản 2 Điểm a",
    presetCode: "TC1_DONG_PHUC",
    keywords: ["thẻ sinh viên", "the sinh vien", "đồng phục", "dong phuc", "áo thể dục", "không mang thẻ", "khong mang the", "quên thẻ", "quen the"],
    proofGuide: "Biên bản kiểm tra tác phong sinh viên của Đội cờ đỏ hoặc Phòng CTSV",
    explanation: "Vi phạm quy định về đeo thẻ sinh viên hoặc trang phục đến trường (-5đ).",
  },
  {
    category: 1,
    points: -10,
    ruleCode: "Điều 4 Khoản 2 Điểm b",
    presetCode: "TC1_SHCD",
    keywords: ["sinh hoạt công dân", "shcd", "sinh hoat cong dan", "tuần shcd", "tuan shcd"],
    proofGuide: "Danh sách điểm danh hoặc biên bản vắng buổi SHCD sinh viên của Nhà trường",
    explanation: "Vắng buổi Sinh hoạt công dân - sinh viên đầu khóa hoặc đầu năm học (-10đ/buổi).",
  },
  {
    category: 1,
    points: -10,
    ruleCode: "Điều 4 Khoản 2 Điểm c",
    presetCode: "TC1_BHYT",
    keywords: ["bhyt", "bảo hiểm y tế", "bao hiem y te", "chậm bhyt", "chua mua bhyt"],
    proofGuide: "Thông báo nộp bổ sung hoặc biên bản trễ hạn của Ban BHYT sinh viên",
    explanation: "Không tham gia hoặc nộp chậm Bảo hiểm Y tế bắt buộc theo luật định (-10đ).",
  },
  {
    category: 1,
    points: -5,
    ruleCode: "Điều 4 Khoản 2 Điểm d",
    presetCode: "TC1_HOC_PHI",
    keywords: ["học phí", "hoc phi", "đóng tiền chậm", "dong tien cham", "nợ học phí", "tre han hoc phi"],
    proofGuide: "Biên nhận tài chính hoặc danh sách gia hạn/trễ hạn học phí",
    explanation: "Nộp học phí không đúng thời hạn quy định của Nhà trường (-5đ).",
  },
  {
    category: 1,
    points: -20,
    ruleCode: "Điều 4 Khoản 2 Điểm e",
    presetCode: "TC1_QUY_CHE_THI",
    keywords: ["thi hộ", "thi ho", "gian lận thi", "gian lan", "vi phạm quy chế thi", "kỷ luật thi"],
    proofGuide: "Biên bản xử lý kỷ luật phòng thi có xác nhận của Hội đồng coi thi",
    explanation: "Vi phạm quy chế thi cử (mang tài liệu trái phép, gian lận, thi hộ) (-20đ).",
  },
  {
    category: 1,
    points: -5,
    ruleCode: "Điều 4 Khoản 2 Điểm f",
    presetCode: "TC1_HUT_THUOC",
    keywords: ["hút thuốc", "hut thuoc", "thuốc lá", "thuoc la", "vape"],
    proofGuide: "Biên bản nhắc nhở/xử phạt của Tổ kiểm tra vệ sinh học đường",
    explanation: "Hút thuốc lá trong khuôn viên Nhà trường (-5đ).",
  },

  // --- TIÊU CHÍ 2: Ý thức và thái độ trong học tập ---
  {
    category: 2,
    points: -2,
    ruleCode: "Điều 5 Khoản 2 Điểm a",
    presetCode: "TC2_ROT_1_MON",
    keywords: ["rớt môn", "rot mon", "thi lại", "thi lai", "học lại", "hoc lai", "nợ môn", "no mon", "điểm f", "diem f"],
    proofGuide: "Bảng điểm cá nhân trên trang sinh viên portal.huit.edu.vn",
    explanation: "Bị điểm F hoặc thi rớt môn học trong học kỳ (-2đ/môn đến tối đa -20đ).",
  },
  {
    category: 2,
    points: -10,
    ruleCode: "Điều 5 Khoản 2 Điểm b",
    presetCode: "TC2_CANH_BAO",
    keywords: ["cảnh báo học vụ", "canh bao hoc vu", "kỷ luật học tập"],
    proofGuide: "Quyết định xử lý học vụ của Ban Giám hiệu Nhà trường",
    explanation: "Bị cảnh báo học vụ do điểm trung bình học kỳ không đạt chuẩn (-10đ).",
  },
  {
    category: 2,
    points: 3,
    ruleCode: "Điều 5 Khoản 1 Điểm a",
    presetCode: "TC2_CLB_HOC_THUAT",
    keywords: ["clb học thuật", "clb hoc thuat", "câu lạc bộ học thuật", "nhóm học tập", "seminar chuyên ngành"],
    proofGuide: "Giấy chứng nhận thành viên hoặc quyết định công nhận của Ban chủ nhiệm CLB",
    explanation: "Tham gia tích cực câu lạc bộ học thuật, nhóm học tập chuyên ngành (+3đ).",
  },
  {
    category: 2,
    points: 5,
    ruleCode: "Điều 5 Khoản 1 Điểm b",
    presetCode: "TC2_CHUNG_CHI_NN",
    keywords: ["ielts", "toeic", "toefl", "b1", "b2", "ngoại ngữ", "ngoai ngu", "chứng chỉ tiếng anh", "chuẩn đầu ra"],
    proofGuide: "Bản sao công chứng hoặc ảnh chụp chứng chỉ quốc tế hợp lệ nộp về Văn phòng Khoa",
    explanation: "Đạt chứng chỉ ngoại ngữ quốc tế hoặc vượt chuẩn đầu ra ngoại ngữ (+5đ).",
  },

  // --- TIÊU CHÍ 3: Hoạt động chính trị - xã hội, VHVN, TDTT ---
  {
    category: 3,
    points: 6,
    ruleCode: "Điều 6 Khoản 1 Điểm a",
    presetCode: "TC3_TINH_NGUYEN_LON",
    keywords: ["mùa hè xanh", "mua he xanh", "mhx", "tiếp sức mùa thi", "tiep suc mua thi", "xuân tình nguyện", "xuan tinh nguyen", "chiến dịch tình nguyện"],
    proofGuide: "Giấy chứng nhận hoàn thành chiến dịch tình nguyện có mộc đỏ Đoàn - Hội Trường HUIT",
    explanation: "Tham gia trọn vẹn chiến dịch tình nguyện lớn cấp Trường hoặc cấp Thành phố (+6đ).",
  },
  {
    category: 3,
    points: 5,
    ruleCode: "Điều 6 Khoản 1 Điểm b",
    presetCode: "TC3_HIEN_MAU",
    keywords: ["hiến máu", "hien mau", "hiến máu tình nguyện", "hien mau nhan dao", "giọt máu đào"],
    proofGuide: "Giấy chứng nhận hiến máu tình nguyện của Hội Chữ thập đỏ hoặc Viện Huyết học",
    explanation: "Tham gia hiến máu nhân đạo vì cộng đồng (+5đ/lần).",
  },
  {
    category: 3,
    points: 4,
    ruleCode: "Điều 6 Khoản 1 Điểm c",
    presetCode: "TC3_HOI_THAO_KY_NANG",
    keywords: ["hội thảo kỹ năng", "hoi thao ky nang", "kỹ năng mềm", "ky nang mem", "ngày hội việc làm", "ngay hoi viec lam", "hướng nghiệp", "huong nghiep", "seminar kỹ năng"],
    proofGuide: "Giấy chứng nhận tham gia hoặc mã QR check-in xác nhận từ Ban Tổ chức Trường",
    explanation: "Tham gia hội thảo kỹ năng mềm, ngày hội việc làm và hướng nghiệp sinh viên (+4đ).",
  },
  {
    category: 3,
    points: 4,
    ruleCode: "Điều 6 Khoản 1 Điểm d",
    presetCode: "TC3_THI_VHVN_TDTT",
    keywords: ["marathon", "giải chạy", "giai chay", "bóng đá", "bong da", "cầu lông", "cau long", "bóng chuyền", "bong chuyen", "tdtt", "hội thao", "hoi thao", "văn nghệ", "van nghe", "hội diễn", "tiếng hát"],
    proofGuide: "Ảnh chụp số đeo BIB, giấy chứng nhận tham gia hoặc quyết định công nhận giải",
    explanation: "Tham gia thi đấu giải văn nghệ, thể dục thể thao cấp Khoa hoặc cấp Trường (+4đ đến +6đ).",
  },
  {
    category: 3,
    points: 2,
    ruleCode: "Điều 6 Khoản 1 Điểm e",
    presetCode: "TC3_CO_VU",
    keywords: ["cổ vũ", "co vu", "khán giả", "dong vien", "đội cổ động", "cổ động viên"],
    proofGuide: "Hình ảnh check-in có mặt tại khán đài sự kiện hoặc danh sách xác nhận của Lớp",
    explanation: "Tham gia cổ vũ, tiếp sức cho các hội thi, giải đấu của Khoa/Trường (+2đ).",
  },
  {
    category: 3,
    points: 4,
    ruleCode: "Điều 6 Khoản 1 Điểm g",
    presetCode: "TC3_DOI_THOAI",
    keywords: ["đối thoại", "doi thoai", "đối thoại sinh viên", "gặp gỡ ban giám hiệu", "ngày hội sinh viên", "ngay hoi sinh vien"],
    proofGuide: "Danh sách điểm danh hoặc vé mời/check-in buổi đối thoại trực tiếp",
    explanation: "Tham gia buổi đối thoại định kỳ giữa Ban Giám hiệu với sinh viên (+4đ).",
  },

  // --- TIÊU CHÍ 4: Phẩm chất công dân trong quan hệ cộng đồng ---
  {
    category: 4,
    points: 4,
    ruleCode: "Điều 7 Khoản 1 Điểm a",
    presetCode: "TC4_QUYEN_GOP",
    keywords: ["ủng hộ", "ung ho", "cứu trợ", "cuu tro", "đồng bào", "lũ lụt", "lu lut", "mặt trận tổ quốc", "mttq", "từ thiện", "tu thien", "quyên góp", "quyen gop", "quỹ học bổng"],
    proofGuide: "Biên lai chuyển khoản vào tài khoản chính thức (MTTQ/Đoàn Trường) hoặc giấy xác nhận đóng góp",
    explanation: "Quyên góp, ủng hộ đồng bào bị bão lũ, quỹ người nghèo hoặc hoạt động thiện nguyện (+4đ).",
  },
  {
    category: 4,
    points: 3,
    ruleCode: "Điều 7 Khoản 1 Điểm b",
    presetCode: "TC4_MOI_TRUONG",
    keywords: ["môi trường", "moi truong", "chủ nhật xanh", "chu nhat xanh", "trồng cây", "trong cay", "nhặt rác", "nhat rac", "dọn dẹp", "don dep ve sinh"],
    proofGuide: "Ảnh chụp trực tiếp tham gia ngày lao động công ích hoặc xác nhận của Đoàn thanh niên",
    explanation: "Tham gia Ngày Chủ Nhật Xanh, bảo vệ môi trường, tôn tạo cảnh quan Nhà trường (+3đ).",
  },
  {
    category: 4,
    points: -15,
    ruleCode: "Điều 7 Khoản 2 Điểm a",
    presetCode: "TC4_VI_PHAM_MXH",
    keywords: ["phát ngôn sai lệch", "phat ngon", "mạng xã hội", "mxh", "xúc phạm", "xuc pham", "bôi nhọ", "boi nho", "an ninh trật tự"],
    proofGuide: "Biên bản làm việc của Hội đồng Kỷ luật Nhà trường hoặc cơ quan chức năng",
    explanation: "Phát ngôn sai lệch chuẩn mực trên mạng xã hội hoặc vi phạm an ninh trật tự (-15đ).",
  },

  // --- TIÊU CHÍ 5: Công tác cán bộ, NCKH & Thành tích ---
  {
    category: 5,
    points: 10,
    ruleCode: "Điều 8 Khoản 1 Điểm a",
    presetCode: "TC5_NCKH_TRUONG",
    keywords: ["nckh", "nghiên cứu khoa học", "nghien cuu khoa hoc", "đề tài nckh", "de tai nckh", "eureka", "nghiên cứu cấp trường", "báo cáo khoa học"],
    proofGuide: "Quyết định nghiệm thu đề tài NCKH hoặc giấy chứng nhận tham gia Hội nghị sinh viên NCKH",
    explanation: "Thực hiện đề tài Nghiên cứu khoa học sinh viên được nghiệm thu hoặc dự thi giải Eureka (+5đ đến +20đ).",
  },
  {
    category: 5,
    points: 10,
    ruleCode: "Điều 8 Khoản 1 Điểm b",
    presetCode: "TC5_SV5T",
    keywords: ["sinh viên 5 tốt", "sinh vien 5 tot", "sv5t", "sinh viên năm tốt", "danh hiệu sv5t"],
    proofGuide: "Giấy chứng nhận danh hiệu Sinh viên 5 Tốt cấp Khoa, cấp Trường hoặc cấp Thành phố",
    explanation: "Đạt danh hiệu Sinh viên 5 Tốt được tuyên dương và khen thưởng (+5đ đến +10đ).",
  },
  {
    category: 5,
    points: 6,
    ruleCode: "Điều 8 Khoản 1 Điểm c",
    presetCode: "TC5_CAN_BO_TRUONG",
    keywords: ["lớp trưởng", "lop truong", "bí thư", "bi thu", "bch đoàn", "bch hội", "ủy viên ban chấp hành", "chu nhiem clb", "chủ nhiệm clb"],
    proofGuide: "Quyết định chuẩn y ban cán sự/BCH và biên bản họp đánh giá hoàn thành tốt nhiệm vụ",
    explanation: "Lớp trưởng, Bí thư chi đoàn hoặc Chủ nhiệm CLB hoàn thành tốt nhiệm vụ năm học (+6đ đến +10đ).",
  },
  {
    category: 5,
    points: 4,
    ruleCode: "Điều 8 Khoản 1 Điểm d",
    presetCode: "TC5_CAN_BO_PHO",
    keywords: ["lớp phó", "lop pho", "phó bí thư", "pho bi thu", "tổ trưởng", "to truong", "thủ quỹ", "thu quy", "phó chủ nhiệm"],
    proofGuide: "Danh sách ban cán sự lớp và xác nhận mức độ hoàn thành nhiệm vụ từ GVCN/CVHT",
    explanation: "Lớp phó, Phó bí thư hoặc Ban điều hành hoàn thành tốt nhiệm vụ (+4đ đến +6đ).",
  },
  {
    category: 5,
    points: 3,
    ruleCode: "Điều 8 Khoản 1 Điểm e",
    presetCode: "TC5_THANH_VIEN_CLB",
    keywords: ["thành viên clb", "thanh vien clb", "thành viên đội", "đội cờ đỏ", "đội xung kích", "đội ctxh", "clb tình nguyện"],
    proofGuide: "Thẻ thành viên CLB hoặc giấy chứng nhận đóng góp từ Ban Chủ nhiệm CLB trực thuộc HUIT",
    explanation: "Là thành viên tích cực của Câu lạc bộ/Đội/Nhóm trực thuộc Trường hoặc Đoàn - Hội (+3đ).",
  },
  {
    category: 5,
    points: 2,
    ruleCode: "Điều 8 Khoản 1 Điểm f",
    presetCode: "TC5_BINH_CHON",
    keywords: ["bình chọn", "binh chon", "like", "chia sẻ", "chia se", "share", "tương tác", "tuong tac cuộc thi", "minigame trường"],
    proofGuide: "Ảnh chụp màn hình (screenshot) thể hiện tài khoản cá nhân đã tương tác/bình chọn theo quy định",
    explanation: "Tham gia tương tác, chia sẻ và bình chọn cho các cuộc thi trực tuyến cấp Trường (+1đ đến +2đ).",
  },
  {
    category: 5,
    points: 5,
    ruleCode: "Điều 8 Khoản 1 Điểm g",
    presetCode: "TC5_KHEN_THUONG",
    keywords: ["bằng khen", "bang khen", "giấy khen", "giay khen", "khen thưởng", "khen thuong", "thành tích xuất sắc", "tuyên dương"],
    proofGuide: "Bản sao hoặc hình ảnh giấy khen/bằng khen của Hiệu trưởng, Đoàn Trường hoặc cấp cao hơn",
    explanation: "Được nhận Giấy khen hoặc Bằng khen vì thành tích đột xuất/toàn diện (+5đ đến +10đ).",
  },
];

const CATEGORY_NAMES: Record<number, string> = {
  1: "TC1: Ý thức chấp hành pháp luật & nội quy",
  2: "TC2: Ý thức và thái độ trong học tập",
  3: "TC3: Hoạt động chính trị - xã hội, VHVN, TDTT",
  4: "TC4: Phẩm chất công dân & cộng đồng",
  5: "TC5: Cán bộ, NCKH & Khen thưởng",
};

/**
 * Classifies an activity string into an official HUIT Decision 3385 criterion
 */
export function classifyHuitActivity(
  input: string
): ActivityClassificationResult | null {
  if (!input || input.trim().length < 3) return null;

  const normalized = input.toLowerCase().trim();

  let bestRule: ClassifierRule | null = null;
  let highestScore = 0;

  for (const rule of CLASSIFIER_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        // Longer keyword matches earn higher weight
        score += kw.length * 2;
        if (normalized.startsWith(kw) || normalized.endsWith(kw)) {
          score += 5;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestRule = rule;
    }
  }

  if (!bestRule || highestScore < 4) {
    return null;
  }

  const confidence: ActivityClassificationResult["confidence"] =
    highestScore >= 16 ? "high" : highestScore >= 8 ? "medium" : "low";

  return {
    matchedCategory: bestRule.category,
    suggestedPoints: bestRule.points,
    confidence,
    matchedRule: bestRule.ruleCode,
    matchedPresetCode: bestRule.presetCode,
    categoryName: CATEGORY_NAMES[bestRule.category],
    requiredProofGuide: bestRule.proofGuide,
    explanation: bestRule.explanation,
  };
}

