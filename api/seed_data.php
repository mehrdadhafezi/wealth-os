<?php

// First-run seed data — inserted once by seed.php when the assets table is
// still empty for APP_USER_ID, so the dashboard isn't blank on first use.
// Values mirror what used to be hardcoded in App.jsx / the Supabase-era dataApi.js.

function seed_wealth_snapshot(): array
{
    return [
        'cash' => 2450000,
        'liabilities' => 3650000,
        'gold_grams' => 320,
        'gold_value' => 940000,
        'crypto_btc' => 6.2,
        'crypto_value' => 690000,
        'business_shares' => [
            'estor' => 7800000,
            'biyavin' => 2650000,
            'romina' => 1980000,
            'teflon' => 3450000,
        ],
        'villa_value' => 2100000,
    ];
}

function seed_assets(): array
{
    return [
        ['name' => 'سهم مالکیت — Estor / Novin Rahkar', 'category' => 'کسب‌وکار', 'purchase_date' => '۱۴۰۰/۰۳', 'purchase_value' => 4200000, 'current_value' => 7800000, 'annual_return' => 24.1, 'risk' => 4, 'liquidity' => 1, 'horizon' => 'بلندمدت', 'ai_recommendation' => 'Hold'],
        ['name' => 'سهم مالکیت — Biyavin', 'category' => 'کسب‌وکار', 'purchase_date' => '۱۴۰۱/۰۱', 'purchase_value' => 1800000, 'current_value' => 2650000, 'annual_return' => 18.4, 'risk' => 4, 'liquidity' => 1, 'horizon' => 'بلندمدت', 'ai_recommendation' => 'Add'],
        ['name' => 'برند رومینا (کازمتیک)', 'category' => 'کسب‌وکار', 'purchase_date' => '۱۳۹۹/۰۶', 'purchase_value' => 1200000, 'current_value' => 1980000, 'annual_return' => 12.6, 'risk' => 3, 'liquidity' => 2, 'horizon' => 'بلندمدت', 'ai_recommendation' => 'Hold'],
        ['name' => 'کارخانه تفلون', 'category' => 'کسب‌وکار', 'purchase_date' => '۱۳۹۸/۰۲', 'purchase_value' => 3100000, 'current_value' => 3450000, 'annual_return' => 3.2, 'risk' => 3, 'liquidity' => 1, 'horizon' => 'بلندمدت', 'ai_recommendation' => 'Hold'],
        ['name' => 'ویلای شمال — کلاردشت', 'category' => 'املاک', 'purchase_date' => '۱۳۹۷/۰۵', 'purchase_value' => 900000, 'current_value' => 2100000, 'annual_return' => 15.8, 'risk' => 2, 'liquidity' => 2, 'horizon' => 'بلندمدت', 'ai_recommendation' => 'Hold'],
        ['name' => 'آپارتمان اجاری — تهران', 'category' => 'املاک', 'purchase_date' => '۱۴۰۲/۰۸', 'purchase_value' => 1500000, 'current_value' => 1680000, 'annual_return' => 8.9, 'risk' => 2, 'liquidity' => 3, 'horizon' => 'میان‌مدت', 'ai_recommendation' => 'Add'],
        ['name' => 'سبد سهام بورس داخلی', 'category' => 'سهام', 'purchase_date' => '۱۴۰۲/۰۲', 'purchase_value' => 1100000, 'current_value' => 980000, 'annual_return' => -5.4, 'risk' => 4, 'liquidity' => 4, 'horizon' => 'کوتاه‌مدت', 'ai_recommendation' => 'Sell'],
        ['name' => 'ETF شاخص جهانی S&P', 'category' => 'صندوق (ETF)', 'purchase_date' => '۱۴۰۲/۰۵', 'purchase_value' => 640000, 'current_value' => 812000, 'annual_return' => 17.6, 'risk' => 3, 'liquidity' => 5, 'horizon' => 'بلندمدت', 'ai_recommendation' => 'Add'],
        ['name' => 'Bitcoin', 'category' => 'کریپتو', 'purchase_date' => '۱۴۰۱/۰۷', 'purchase_value' => 420000, 'current_value' => 690000, 'annual_return' => 28.3, 'risk' => 5, 'liquidity' => 5, 'horizon' => 'میان‌مدت', 'ai_recommendation' => 'Hold'],
        ['name' => 'سپرده بانکی کوتاه‌مدت', 'category' => 'نقد', 'purchase_date' => '۱۴۰۳/۰۱', 'purchase_value' => 2400000, 'current_value' => 2450000, 'annual_return' => 2.1, 'risk' => 1, 'liquidity' => 5, 'horizon' => 'کوتاه‌مدت', 'ai_recommendation' => 'Hold'],
        ['name' => 'وام اعطایی به شریک تجاری', 'category' => 'طلب (وام اعطایی)', 'purchase_date' => '۱۴۰۲/۱۰', 'purchase_value' => 500000, 'current_value' => 540000, 'annual_return' => 8.0, 'risk' => 3, 'liquidity' => 1, 'horizon' => 'میان‌مدت', 'ai_recommendation' => 'Hold'],
    ];
}

function seed_commodities(): array
{
    return [
        ['name' => 'طلا', 'symbol' => 'XAU', 'price' => 2380, 'unit' => 'اونس', 'change_pct' => 0.8, 'valuation' => 'Undervalued', 'confidence' => 74, 'phase' => 'Recovery', 'angle' => 250, 'trend' => [2210, 2255, 2240, 2300, 2340, 2380], 'producers' => [['c' => 'چین', 'p' => 10], ['c' => 'استرالیا', 'p' => 9], ['c' => 'روسیه', 'p' => 8]], 'geo_risk' => 35, 'infl' => 0.78, 'dxy' => -0.65],
        ['name' => 'نقره', 'symbol' => 'XAG', 'price' => 29.4, 'unit' => 'اونس', 'change_pct' => 1.2, 'valuation' => 'Fair', 'confidence' => 58, 'phase' => 'Recovery', 'angle' => 235, 'trend' => [24.1, 25.6, 26.0, 27.4, 28.5, 29.4], 'producers' => [['c' => 'مکزیک', 'p' => 22], ['c' => 'پرو', 'p' => 15], ['c' => 'چین', 'p' => 14]], 'geo_risk' => 30, 'infl' => 0.71, 'dxy' => -0.58],
        ['name' => 'مس', 'symbol' => 'CU', 'price' => 4.52, 'unit' => 'پوند', 'change_pct' => -0.3, 'valuation' => 'Overvalued', 'confidence' => 66, 'phase' => 'Peak', 'angle' => 20, 'trend' => [3.85, 4.02, 4.20, 4.35, 4.48, 4.52], 'producers' => [['c' => 'شیلی', 'p' => 27], ['c' => 'پرو', 'p' => 10], ['c' => 'چین', 'p' => 8]], 'geo_risk' => 40, 'infl' => 0.62, 'dxy' => -0.44],
    ];
}
