import psycopg2
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(".env.local") as f:
    lines = dict(l.strip().split("=", 1) for l in f if "=" in l and not l.startswith("#"))
CONN_STR = lines.get("DATABASE_URL_OWNER", lines.get("DATABASE_URL")).strip('"')

PRESETS = [
    # Tiêu chí 1: Tối đa 25 điểm
    ("TC1_DEFAULT", 1, "TC1_DEFAULT", "Điểm mặc định Tiêu chí 1 (Ý thức chấp hành nội quy, quy chế)", "default", 25, 25, "điểm", "Mặc định cho mỗi sinh viên khi bắt đầu kỳ"),
    ("TC1_SHCD", 1, "TC1_SHCD", "Không tham gia Tuần sinh hoạt công dân sinh viên (SHCD)", "deduct", -5, 25, "lần", "Trừ 5 điểm/lần vi phạm"),
    ("TC1_BHYT", 1, "TC1_BHYT", "Không tham gia Bảo hiểm Y tế (BHYT)", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_KHAM_SK", 1, "TC1_KHAM_SK", "Không tham gia khám sức khỏe theo thông báo của Trường", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_HO_SO_SV", 1, "TC1_HO_SO_SV", "Không hoàn thiện hồ sơ sinh viên theo quy định", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_TAI_CHINH", 1, "TC1_TAI_CHINH", "Không hoàn thành nghĩa vụ tài chính (học phí, lệ phí đúng hạn)", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_VE_SINH", 1, "TC1_VE_SINH", "Không giữ vệ sinh trường, lớp học", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_DONG_PHUC", 1, "TC1_DONG_PHUC", "Không đeo thẻ SV hoặc không mặc đồng phục khi đến trường", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_HUT_THUOC", 1, "TC1_HUT_THUOC", "Hút thuốc không đúng nơi quy định", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_NGOAI_TRU", 1, "TC1_NGOAI_TRU", "Không cập nhật thông tin sinh viên / thông tin ngoại trú", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_KHAO_SAT", 1, "TC1_KHAO_SAT", "Không tham gia các khảo sát của Khoa / Trường", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_MAT_TRAT_TU", 1, "TC1_MAT_TRAT_TU", "Gây ồn ào, mất trật tự làm ảnh hưởng đến giờ học", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_DE_XE", 1, "TC1_DE_XE", "Vi phạm để xe không đúng nơi quy định", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_DI_CHUYEN_TS", 1, "TC1_DI_CHUYEN_TS", "Tự ý di chuyển trang thiết bị, tài sản ra khỏi vị trí lắp đặt", "deduct", -5, 25, "lần", "Trừ 5 điểm"),
    ("TC1_NOI_QUY_KHAC", 1, "TC1_NOI_QUY_KHAC", "Vi phạm nội quy, quy chế khác tại Trường", "deduct", -10, 25, "lần", "Trừ 10 điểm"),
    ("TC1_SAI_QUY_DINH", 1, "TC1_SAI_QUY_DINH", "Không thực hiện đúng quy định của nhà trường", "deduct", -20, 25, "lần", "Trừ 20 điểm"),
    ("TC1_KHIEN_TRACH", 1, "TC1_KHIEN_TRACH", "Vi phạm kỷ luật ở mức khiển trách", "deduct", -25, 25, "lần", "Trừ 25 điểm"),

    # Tiêu chí 2: Tối đa 20 điểm
    ("TC2_DEFAULT", 2, "TC2_DEFAULT", "Điểm mặc định Tiêu chí 2 (Ý thức và thái độ học tập)", "default", 20, 20, "điểm", "Mặc định cho mỗi sinh viên khi bắt đầu kỳ"),
    ("TC2_ROT_1_MON", 2, "TC2_ROT_1_MON", "Thi rớt 1 môn học trong học kỳ", "deduct", -2, 20, "môn", "Trừ 2 điểm"),
    ("TC2_ROT_2_5_MON", 2, "TC2_ROT_2_5_MON", "Thi rớt từ 2 đến 5 môn học trong học kỳ", "deduct", -5, 20, "lần", "Trừ 5 điểm"),
    ("TC2_ROT_TREN_5_MON", 2, "TC2_ROT_TREN_5_MON", "Thi rớt trên 5 môn học trong học kỳ", "deduct", -20, 20, "lần", "Trừ 20 điểm"),
    ("TC2_HV_KHIEN_TRACH", 2, "TC2_HV_KHIEN_TRACH", "Vi phạm quy chế học vụ (Quyết định khiển trách)", "deduct", -15, 20, "lần", "Trừ 15 điểm/lần"),
    ("TC2_HV_CANH_BAO", 2, "TC2_HV_CANH_BAO", "Vi phạm quy chế học vụ (Quyết định cảnh báo học vụ)", "deduct", -20, 20, "lần", "Trừ 20 điểm/lần"),

    # Tiêu chí 3: Tối đa 20 điểm
    ("TC3_TUYEN_TRUYEN", 3, "TC3_TUYEN_TRUYEN", "Tham dự hoạt động tuyên truyền, GD chính trị tư tưởng, phổ biến pháp luật", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_QUANG_BA", 3, "TC3_QUANG_BA", "Tham dự hoạt động, hội thi quảng bá hình ảnh thương hiệu HUIT", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_SU_KIEN_CTXH", 3, "TC3_SU_KIEN_CTXH", "Tham gia sự kiện chính trị - xã hội (hội nghị, đại hội, kỷ niệm...)", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_GIUP_NGUOI", 3, "TC3_GIUP_NGUOI", "Tham gia hoạt động giúp người, cứu người được cơ quan ghi nhận", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_PHONG_CHONG_TP", 3, "TC3_PHONG_CHONG_TP", "Hoạt động phòng chống tội phạm, tệ nạn xã hội do Trường điều động", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_CUOC_THI_TRUONG", 3, "TC3_CUOC_THI_TRUONG", "Tham gia cuộc thi, hoạt động VHVN - TDTT cấp Trường", "add", 6, 20, "HĐ", "+6 điểm/hoạt động"),
    ("TC3_CUOC_THI_KHOA", 3, "TC3_CUOC_THI_KHOA", "Tham gia cuộc thi, hoạt động VHVN - TDTT cấp Khoa", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_CO_VU", 3, "TC3_CO_VU", "Cổ vũ hoạt động cấp Trường / cấp Khoa", "add", 2, 20, "HĐ", "+2 điểm/hoạt động"),
    ("TC3_DAT_GIAI_TRUONG_KHOA", 3, "TC3_DAT_GIAI_TRUONG_KHOA", "Sinh viên tham gia thi và đạt giải (cấp Trường/Khoa)", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_BTC_TRUONG", 3, "TC3_BTC_TRUONG", "Thành viên Ban tổ chức cuộc thi cấp Trường", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_BTC_KHOA", 3, "TC3_BTC_KHOA", "Thành viên Ban tổ chức cuộc thi cấp Khoa", "add", 3, 20, "HĐ", "+3 điểm/hoạt động"),
    ("TC3_DIA_PHUONG", 3, "TC3_DIA_PHUONG", "Tham gia hoạt động tại địa phương có khen thưởng", "add", 2, 20, "HĐ", "+2 điểm/hoạt động"),
    ("TC3_NGOAI_TRUONG_G1", 3, "TC3_NGOAI_TRUONG_G1", "Thi ngoài trường đạt Giải Nhất", "add", 5, 20, "HĐ", "+5 điểm/hoạt động"),
    ("TC3_NGOAI_TRUONG_G2", 3, "TC3_NGOAI_TRUONG_G2", "Thi ngoài trường đạt Giải Nhì", "add", 4, 20, "HĐ", "+4 điểm/hoạt động"),
    ("TC3_NGOAI_TRUONG_G3", 3, "TC3_NGOAI_TRUONG_G3", "Thi ngoài trường đạt Giải Ba", "add", 3, 20, "HĐ", "+3 điểm/hoạt động"),
    ("TC3_VANG_MAT", 3, "TC3_VANG_MAT", "Đăng ký tham gia hoạt động/cuộc thi nhưng không đi", "deduct", -5, 20, "lần", "Trừ 5 điểm/lần"),

    # Tiêu chí 4: Tối đa 15 điểm
    ("TC4_DEFAULT", 4, "TC4_DEFAULT", "Điểm mặc định Tiêu chí 4 (Trách nhiệm công dân trong quan hệ cộng đồng)", "default", 15, 15, "điểm", "Mặc định cho mỗi sinh viên khi bắt đầu kỳ"),
    ("TC4_PHAT_NGON_MXH", 4, "TC4_PHAT_NGON_MXH", "Phát ngôn không chuẩn mực trên mạng xã hội bị xử lý", "deduct", -15, 15, "lần", "Trừ 15 điểm"),
    ("TC4_AN_NINH_TT", 4, "TC4_AN_NINH_TT", "Gây rối mất an ninh trật tự, vi phạm ATGT... có biên bản xử phạt", "deduct", -15, 15, "lần", "Trừ 15 điểm"),

    # Tiêu chí 5: Tối đa 20 điểm
    ("TC5_DOAN_HOI_TRUONG_XS", 5, "TC5_DOAN_HOI_TRUONG_XS", "BCH Đoàn - Hội cấp Trường, Chi ủy chi bộ SV (Hoàn thành xuất sắc)", "add", 10, 20, "HK", "+10 điểm/học kỳ"),
    ("TC5_DOAN_HOI_TRUONG_TOT", 5, "TC5_DOAN_HOI_TRUONG_TOT", "BCH Đoàn - Hội cấp Trường, Chi ủy chi bộ SV (Hoàn thành tốt)", "add", 7, 20, "HK", "+7 điểm/học kỳ"),
    ("TC5_DOAN_HOI_TRUONG_HT", 5, "TC5_DOAN_HOI_TRUONG_HT", "BCH Đoàn - Hội cấp Trường, Chi ủy chi bộ SV (Hoàn thành)", "add", 5, 20, "HK", "+5 điểm/học kỳ"),
    ("TC5_DOAN_HOI_KHOA_LT_XS", 5, "TC5_DOAN_HOI_KHOA_LT_XS", "BCH Đoàn - Hội cấp Khoa, Lớp trưởng (Hoàn thành xuất sắc)", "add", 8, 20, "HK", "+8 điểm/học kỳ"),
    ("TC5_DOAN_HOI_KHOA_LT_TOT", 5, "TC5_DOAN_HOI_KHOA_LT_TOT", "BCH Đoàn - Hội cấp Khoa, Lớp trưởng (Hoàn thành tốt)", "add", 5, 20, "HK", "+5 điểm/học kỳ"),
    ("TC5_DOAN_HOI_KHOA_LT_HT", 5, "TC5_DOAN_HOI_KHOA_LT_HT", "BCH Đoàn - Hội cấp Khoa, Lớp trưởng (Hoàn thành)", "add", 3, 20, "HK", "+3 điểm/học kỳ"),
    ("TC5_CLB_LP_BT_XS", 5, "TC5_CLB_LP_BT_XS", "Chủ nhiệm CLB cấp Trường, Lớp phó kiêm Bí thư (Hoàn thành xuất sắc)", "add", 7, 20, "HK", "+7 điểm/học kỳ"),
    ("TC5_CLB_LP_BT_TOT", 5, "TC5_CLB_LP_BT_TOT", "Chủ nhiệm CLB cấp Trường, Lớp phó kiêm Bí thư (Hoàn thành tốt)", "add", 4, 20, "HK", "+4 điểm/học kỳ"),
    ("TC5_CLB_LP_BT_HT", 5, "TC5_CLB_LP_BT_HT", "Chủ nhiệm CLB cấp Trường, Lớp phó kiêm Bí thư (Hoàn thành)", "add", 3, 20, "HK", "+3 điểm/học kỳ"),
    ("TC5_THANH_VIEN_CLB", 5, "TC5_THANH_VIEN_CLB", "Thành viên CLB, đội nhóm trực thuộc Trường quản lý (HĐ thường xuyên)", "add", 3, 20, "HK", "+3 điểm/học kỳ"),
    ("TC5_NCKH_QG", 5, "TC5_NCKH_QG", "Nghiên cứu khoa học (NCKH) đạt giải Cấp Quốc gia", "add", 20, 20, "giải", "+20 điểm"),
    ("TC5_NCKH_TP", 5, "TC5_NCKH_TP", "Nghiên cứu khoa học (NCKH) đạt giải Cấp Thành phố", "add", 15, 20, "giải", "+15 điểm"),
    ("TC5_NCKH_TRUONG", 5, "TC5_NCKH_TRUONG", "Nghiên cứu khoa học (NCKH) đạt giải Cấp Trường", "add", 10, 20, "giải", "+10 điểm"),
    ("TC5_NCKH_KHOA", 5, "TC5_NCKH_KHOA", "Nghiên cứu khoa học (NCKH) đạt giải Cấp Khoa", "add", 5, 20, "giải", "+5 điểm"),
    ("TC5_NCKH_NGOAI_TRUONG", 5, "TC5_NCKH_NGOAI_TRUONG", "NCKH đạt giải đơn vị ngoài trường", "add", 4, 20, "giải", "+4 điểm"),
    ("TC5_HOI_THAO_TRUONG", 5, "TC5_HOI_THAO_TRUONG", "Tham gia Hội thảo, chuyên đề NCKH cấp Trường", "add", 5, 20, "CĐ", "+5 điểm/chuyên đề"),
    ("TC5_HOI_THAO_KHOA", 5, "TC5_HOI_THAO_KHOA", "Tham gia Hội thảo, chuyên đề NCKH cấp Khoa", "add", 3, 20, "CĐ", "+3 điểm/chuyên đề"),
    ("TC5_HOI_THAO_VANG", 5, "TC5_HOI_THAO_VANG", "Đăng ký Hội thảo NCKH nhưng không tham gia", "deduct", -5, 20, "lần", "Trừ 5 điểm/lần"),
    ("TC5_BINH_CHON_TRUONG", 5, "TC5_BINH_CHON_TRUONG", "Tham gia bình chọn, like các cuộc thi, HĐ cấp Trường", "add", 2, 20, "HĐ", "+2 điểm/hoạt động"),
    ("TC5_BINH_CHON_KHOA", 5, "TC5_BINH_CHON_KHOA", "Tham gia bình chọn, like các cuộc thi, HĐ cấp Khoa", "add", 1, 20, "HĐ", "+1 điểm/hoạt động"),
    ("TC5_SV5T_TRUONG", 5, "TC5_SV5T_TRUONG", "Đạt danh hiệu Sinh viên 5 tốt, Thanh niên tiên tiến cấp Trường", "add", 5, 20, "lần", "+5 điểm/lần"),
    ("TC5_SV5T_TP_TW", 5, "TC5_SV5T_TP_TW", "Đạt danh hiệu Sinh viên 5 tốt cấp Thành phố hoặc Trung ương", "add", 10, 20, "lần", "+10 điểm/lần"),
    ("TC5_CB_KHONG_HT_NV", 5, "TC5_CB_KHONG_HT_NV", "Cán bộ lớp / Đoàn / Hội / CLB không hoàn thành nhiệm vụ", "deduct", -10, 20, "HK", "Trừ 10 điểm/học kỳ"),
]

def main():
    print("=== Seeding HUIT Quy định 3385/QĐ-DCT Criteria Presets ===")
    conn = psycopg2.connect(CONN_STR)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO drl_criteria_presets (id, category, code, title, type, points, max_points_category, unit, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            category = EXCLUDED.category,
            code = EXCLUDED.code,
            title = EXCLUDED.title,
            type = EXCLUDED.type,
            points = EXCLUDED.points,
            max_points_category = EXCLUDED.max_points_category,
            unit = EXCLUDED.unit,
            description = EXCLUDED.description;
    """, PRESETS[0])

    for p in PRESETS:
        cur.execute("""
            INSERT INTO drl_criteria_presets (id, category, code, title, type, points, max_points_category, unit, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                category = EXCLUDED.category,
                code = EXCLUDED.code,
                title = EXCLUDED.title,
                type = EXCLUDED.type,
                points = EXCLUDED.points,
                max_points_category = EXCLUDED.max_points_category,
                unit = EXCLUDED.unit,
                description = EXCLUDED.description;
        """, p)

    cur.execute("SELECT count(*) FROM drl_criteria_presets;")
    cnt = cur.fetchone()[0]
    print(f"Successfully seeded {cnt} criteria presets from HUIT QĐ 3385!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
