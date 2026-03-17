-- 初始化数据库脚本
-- 硫磺价格预测与决策辅助系统

-- 硫磺价格表
CREATE TABLE IF NOT EXISTS sulfur_prices (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    source VARCHAR(100) DEFAULT '现货市场',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 采购报告表
CREATE TABLE IF NOT EXISTS purchase_reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    report_date DATE NOT NULL,
    summary TEXT,
    recommendation VARCHAR(50),
    risk_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入示例价格数据
INSERT INTO sulfur_prices (date, price, source) VALUES
    ('2024-01-01', 1200.00, '现货市场'),
    ('2024-01-08', 1215.50, '现货市场'),
    ('2024-01-15', 1230.00, '现货市场'),
    ('2024-01-22', 1225.00, '现货市场'),
    ('2024-01-29', 1240.00, '现货市场'),
    ('2024-02-05', 1255.50, '现货市场'),
    ('2024-02-12', 1248.00, '现货市场'),
    ('2024-02-19', 1260.00, '现货市场'),
    ('2024-02-26', 1275.00, '现货市场'),
    ('2024-03-04', 1268.50, '现货市场'),
    ('2024-03-11', 1280.00, '现货市场'),
    ('2024-03-18', 1295.00, '现货市场'),
    ('2024-03-25', 1290.00, '现货市场'),
    ('2024-04-01', 1305.50, '现货市场'),
    ('2024-04-08', 1310.00, '现货市场')
ON CONFLICT (date) DO NOTHING;

-- 插入示例报告数据
INSERT INTO purchase_reports (title, report_date, summary, recommendation, risk_level) VALUES
    ('第15周采购分析报告', '2024-04-08', '本周硫磺价格持续上涨，主要受中东运费影响。建议下周适当增加库存。', '建议备库', '中等'),
    ('第14周采购分析报告', '2024-04-01', '市场价格稳定，供应商库存充足，可按需采购。', '按需采购', '低'),
    ('第13周采购分析报告', '2024-03-25', '国际市场波动较大，建议观望一周后再做决策。', '观望为主', '高')
ON CONFLICT DO NOTHING;
