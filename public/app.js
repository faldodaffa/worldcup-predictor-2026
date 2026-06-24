'use strict';

let socket;
let currentData = null;
let previousRanking = {};
let currentLang = 'en';
let chartMode = 'top5';
let probChart = null;
let uniqueFixtureStages = [];
let fixtureStageIndex = 0;
let currentFixturePill = 'All';
let statusFilter = 'results'; 

// ============ i18n TRANSLATIONS ============
const translations = {
    en: {
        nav_overview: "Live Overview",
        nav_matches: "Fixtures & Results",
        nav_groups: "Standings",
        nav_bracket: "Knockout Bracket",
        nav_predictions: "AI Predictions",
        nav_player_stats: "Player Stats",
        nav_journal: "Simulation Methodology",
        journal_title: "A Bivariate Poisson Monte Carlo Approach for Predicting the 2026 FIFA World Cup",
        journal_subtitle: "Published on World Cup Predictor Analytics, June 2026",
        journal_abstract_title: "Abstract",
        journal_abstract: "This paper presents a robust probabilistic model designed to predict the outcomes of the 2026 FIFA World Cup. Utilizing a **Bivariate Poisson Distribution**, the model generates expected goals (xG) for competing nations based on dynamic **Elo Ratings**. The core prediction engine employs a **Monte Carlo Simulation (3,000 iterations)** to resolve complex tournament paths asynchronously. Unlike traditional static models, this architecture integrates **Causal Inference variables**—such as *Underdog Rally*, *Champions' Curse*, and geographic modifiers (altitude, humidity)—ensuring predictions align not only with pure mathematics but also with historical tournament narratives.",
        journal_ch1_title: "1. Bivariate Poisson Distribution & Expected Goals (xG)",
        journal_ch1_desc: "Football is a low-scoring game where goal occurrences can be accurately modeled using the Poisson distribution. The expected number of goals (denoted as $\lambda$) for a team is derived fundamentally from the discrepancy in Elo Ratings between the two competing nations. Let $E_A$ and $E_B$ be the Elo ratings of Team A and Team B.",
        journal_ch1_desc2: "This formula dynamically calculates offensive and defensive strengths. A slight correlation factor (0.1) is applied to form a *Bivariate* distribution, accounting for the reality that a highly offensive game by Team A naturally impacts the defensive structure of Team B.",
        journal_ch2_title: "2. Geographic & Stadium Modifiers",
        journal_ch2_desc: "The 2026 tournament spans across diverse climates in North America. The model applies systemic *debuffs* to away teams based on stadium metadata:",
        journal_ch2_li1: "Extreme altitude introduces a $-0.10$ xG penalty to non-Latin American teams.",
        journal_ch2_li2: "Humidity and indoor AC variations mathematically skew stamina, modeled as an additional variance parameter.",
        journal_ch2_li3: "Teams playing in their home nations (USA, CAN, MEX) receive a strict $+0.15$ xG morale buff.",
        journal_ch3_title: "3. Causal Inference: Momentum, Hubris, & The Curse",
        journal_ch3_desc: "Pure Elo ratings often fail to capture the psychological volatility of knockout football. We injected causal logic into the simulation loop:",
        journal_ch3_curse_title: "Champions' Curse",
        journal_ch3_curse_desc: "Statistically, defending champions face catastrophic early exits (e.g., France 2002, Germany 2018). Argentina faces a rigid -0.1 xG penalty in the Group Stage to simulate this anomaly.",
        journal_ch3_hubris_title: "Anti-Climax Hubris",
        journal_ch3_hubris_desc: "Teams that accumulate maximum momentum (>0.35) during groups often suffer a psychological crash in the knockouts, simulated as a -0.05 xG *hubris* debuff.",
        journal_ch4_title: "4. The 'Smart Upset' Threshold",
        journal_ch4_desc: "To prevent determinism, the model enforces a <em>Power Gap Threshold</em> in the knockout brackets. If the win probability gap between two teams exceeds 25%, the statistical giant is hard-coded to advance. However, if the gap is $\\le 25\\%$, the model unlocks \"Smart Upsets\" — engaging pure Poisson dice rolls to allow historical underdog miracles (e.g., Morocco 2022) to emerge naturally.",
        journal_limit_title: "⚠️ Discussion & Limitations",
        journal_limit_desc: "It must be explicitly stated that predicting football mathematically yields a ceiling accuracy of approximately <strong>60% - 65%</strong>. Football has immense *low-scoring variance* compared to basketball or tennis. A singular red card, injury, or crossbar hit invalidates 90% probabilities instantly. Therefore, the outputs shown in the <em>Global Ranking</em> are probabilistic likelihoods of a parallel universe, not deterministic prophecies.",
        header_final: "⚔️ Projected Final",
        header_champion: "🏆 Projected Champion",
        header_darkhorses: "🚀 Biggest Dark Horse",
        desc_darkhorses: "Highest probability for non-seeded teams to reach Semifinals.",
        header_flops: "📉 Potential Flops",
        desc_flops: "Probability of giant teams failing to reach Knockout Stage (R16).",
        header_live: "🔴 Live & Today's Matches",
        header_recent: "🏁 Recent Matches",
        btn_viewall: "View All ↗",
        msg_nomatches: "No matches today.",
        overview_top_scorers: "⚽ Top Scorers",
        overview_upcoming: "🗓️ Upcoming Matches",
        loading: "Loading...",
        btn_results: "Results",
        btn_upcoming: "Upcoming",
        lang_btn: "🇬🇧 EN",
        group_label: "Group ",
        status_live: "Live Predictor Engine Active"
    },
    id: {
        nav_overview: "Ringkasan Live",
        nav_matches: "Jadwal & Hasil",
        nav_groups: "Klasemen",
        nav_bracket: "Bagan Gugur",
        nav_predictions: "Prediksi AI",
        nav_player_stats: "Statistik Pemain",
        nav_journal: "Metodologi Simulasi",
        journal_title: "Pendekatan Monte Carlo Bivariate Poisson untuk Prediksi Piala Dunia FIFA 2026",
        journal_subtitle: "Diterbitkan pada Analitik Prediktor Piala Dunia, Juni 2026",
        journal_abstract_title: "Abstrak",
        journal_abstract: "Makalah ini menyajikan model probabilistik yang kuat yang dirancang untuk memprediksi hasil Piala Dunia FIFA 2026. Memanfaatkan **Distribusi Poisson Bivariat**, model ini menghasilkan expected goals (xG) untuk negara-negara yang bersaing berdasarkan dinamika **Rating Elo**. Mesin prediksi inti menggunakan **Simulasi Monte Carlo (3.000 iterasi)** untuk menyelesaikan jalur turnamen yang kompleks secara asinkron. Berbeda dengan model statis tradisional, arsitektur ini mengintegrasikan **Variabel Inferensi Kausal**—seperti *Underdog Rally*, *Champions' Curse*, dan modifikator geografis (ketinggian, kelembapan)—memastikan prediksi tidak hanya selaras dengan matematika murni tetapi juga dengan narasi sejarah turnamen.",
        journal_ch1_title: "1. Distribusi Poisson Bivariat & Expected Goals (xG)",
        journal_ch1_desc: "Sepak bola adalah permainan dengan skor rendah di mana terjadinya gol dapat dimodelkan secara akurat menggunakan distribusi Poisson. Jumlah gol yang diharapkan (dilambangkan sebagai $\\lambda$) untuk sebuah tim diturunkan secara mendasar dari perbedaan Rating Elo antara dua negara yang bersaing. Misalkan $E_A$ dan $E_B$ adalah rating Elo dari Tim A dan Tim B.",
        journal_ch1_desc2: "Rumus ini secara dinamis menghitung kekuatan ofensif dan defensif. Faktor korelasi kecil (0,1) diterapkan untuk membentuk distribusi *Bivariat*, memperhitungkan kenyataan bahwa permainan yang sangat ofensif oleh Tim A secara alami berdampak pada struktur defensif Tim B.",
        journal_ch2_title: "2. Modifikator Geografis & Stadion",
        journal_ch2_desc: "Turnamen 2026 membentang di berbagai iklim yang beragam di Amerika Utara. Model menerapkan *debuff* sistemik kepada tim tandang berdasarkan metadata stadion:",
        journal_ch2_li1: "Ketinggian ekstrem memberikan penalti xG sebesar $-0.10$ untuk tim non-Amerika Latin.",
        journal_ch2_li2: "Kelembapan dan variasi AC dalam ruangan secara matematis memiringkan stamina, dimodelkan sebagai parameter varian tambahan.",
        journal_ch2_li3: "Tim yang bermain di negara asal mereka (USA, CAN, MEX) menerima tambahan moral xG yang ketat sebesar $+0.15$.",
        journal_ch3_title: "3. Inferensi Kausal: Momentum, Hubris, & Kutukan",
        journal_ch3_desc: "Peringkat Elo murni seringkali gagal menangkap volatilitas psikologis dari sepak bola babak gugur. Kami menyuntikkan logika kausal ke dalam loop simulasi:",
        journal_ch3_curse_title: "Kutukan Juara Bertahan",
        journal_ch3_curse_desc: "Secara statistik, juara bertahan menghadapi jalan keluar awal yang membawa bencana (misalnya, Prancis 2002, Jerman 2018). Argentina menghadapi penalti xG sebesar -0.1 di Fase Grup untuk mensimulasikan anomali ini.",
        journal_ch3_hubris_title: "Hubris Anti-Klimaks",
        journal_ch3_hubris_desc: "Tim yang mengumpulkan momentum maksimum (>0.35) selama grup sering mengalami kehancuran psikologis di babak gugur, disimulasikan sebagai *debuff* hubris sebesar -0.05 xG.",
        journal_ch4_title: "4. Ambang Batas 'Kejutan Cerdas'",
        journal_ch4_desc: "Untuk mencegah determinisme, model memberlakukan <em>Ambang Batas Kesenjangan Kekuatan</em> di bagan babak gugur. Jika kesenjangan probabilitas kemenangan antara dua tim melebihi 25%, raksasa statistik dikodekan secara keras untuk maju. Namun, jika kesenjangan $\\le 25\\%$, model membuka kunci \"Kejutan Cerdas\" — melibatkan lemparan dadu Poisson murni untuk membiarkan keajaiban tim kuda hitam yang bersejarah (misalnya, Maroko 2022) muncul secara alami.",
        journal_limit_title: "⚠️ Diskusi & Batasan",
        journal_limit_desc: "Harus dinyatakan secara eksplisit bahwa memprediksi sepak bola secara matematis menghasilkan batas atas akurasi sekitar <strong>60% - 65%</strong>. Sepak bola memiliki *varians skor rendah* yang sangat besar dibandingkan dengan bola basket atau tenis. Satu kartu merah, cedera, atau tendangan yang mengenai mistar gawang dapat membatalkan probabilitas 90% dalam sekejap. Oleh karena itu, output yang ditunjukkan dalam <em>Peringkat Global</em> adalah kemungkinan probabilistik dari alam semesta paralel, bukan ramalan deterministik.",
        header_final: "⚔️ Proyeksi Final",
        header_champion: "🏆 Proyeksi Juara",
        header_darkhorses: "🚀 Kuda Hitam Terbaik",
        desc_darkhorses: "Probabilitas tertinggi bagi tim non-unggulan untuk menembus Semifinal.",
        header_flops: "📉 Potensi Gugur",
        desc_flops: "Probabilitas tim raksasa gagal lolos ke Fase Gugur (R16).",
        header_live: "🔴 Pertandingan Hari Ini",
        header_recent: "🏁 Pertandingan Terakhir",
        btn_viewall: "Lihat Semua ↗",
        msg_nomatches: "Tidak ada pertandingan hari ini.",
        overview_top_scorers: "⚽ Pencetak Gol Terbanyak",
        overview_upcoming: "🗓️ Jadwal Mendatang",
        loading: "Memuat...",
        btn_results: "Hasil",
        btn_upcoming: "Jadwal",
        lang_btn: "🇮🇩 ID",
        group_label: "Grup ",
        status_live: "Mesin Prediktor Live Aktif"
    }
};

function toggleLanguage() {
    currentLang = currentLang === 'id' ? 'en' : 'id';
    const btn = document.getElementById('langToggle');
    if (btn) {
        const flagSpan   = btn.querySelector('span:first-child');
        const labelSpan  = btn.querySelector('span:nth-child(2)');
        const badgeSpan  = btn.querySelector('span:last-child');
        if (flagSpan)  flagSpan.textContent  = currentLang === 'id' ? '🇮🇩' : '🇬🇧';
        if (labelSpan) labelSpan.textContent = currentLang === 'id' ? 'Bahasa' : 'Language';
        if (badgeSpan) badgeSpan.textContent = currentLang === 'id' ? 'ID' : 'EN';
    }
    translatePage();
    if (Object.keys(currentData).length > 0) {
        renderOverview();
        renderGroups();
        renderFixtures();
    }
}

function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerHTML = el.innerHTML.replace(el.textContent.trim(), translations[currentLang][key]);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
});

// ============ GLOBAL STATE ============
const GROUP_NAME_MAP = {};
const PREV_PROBS = {};

// ============ HELPERS ============

function animateValue(obj, start, end, duration) {
    if (start === end) {
        obj.innerHTML = end.toFixed(2) + '%';
        return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = (progress * (end - start) + start).toFixed(2) + '%';
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toFixed(2) + '%';
        }
    };
    window.requestAnimationFrame(step);
}

function parseScorerStr(s) {
    if (!s || s === 'null' || !s.trim()) return [];
    const re = /["“”]([^"“”]+)["“”]/g;
    const result = [];
    let match;
    while ((match = re.exec(s)) !== null) {
        let entry = match[1].split(/\d/)[0].trim();
        if (entry) result.push(entry);
    }
    return result;
}

function formatScorerDisplay(s) {
    if (!s || s === 'null') return '';
    const re = /["“”]([^"“”]+)["“”]/g;
    const result = [];
    let match;
    
    const SCORER_OVERRIDES = {
        "maksimilianv araivkhv": "Maximiliano Araújo",
        "ali jast": "Elijah Just",
        "b. khoukhi": "Miro Muheim (OG)",
        "mohamed hany": "Mohamed Hany (OG)",
        "mohamed mhbi": "Mehdi Mehdikhani",
        "ramin rzaiian": "Ramin Rezaeian",
        "abdallh alamri": "Abdullah Al-Amri",
        "jovo lukić": "Jovan Lukić",
        "jovo lukic": "Jovan Lukić",
        "a. diallo": "Amara Diallo",
        "i. saibari": "Ismael Saibari",
        "l. comenencia": "Leandro Comenencia",
        "o. rekik": "Omar Rekik",
        "c. metcalfe": "Connor Metcalfe",
        "i.b. hwang": "Inbeom Hwang",
        "h.g. oh": "Hyeongyu Oh",
        "l. krejčí": "Lukas Krejci",
        "l. krejci": "Lukas Krejci",
        "m. svanberg": "Mattias Svanberg",
        "c. larin": "Cyle Larin",
        "j. mcginn": "John McGinn",
        "n. schlotterbeck": "Nico Schlotterbeck",
        "j. musiala": "Jamal Musiala",
        "n. brown": "Nathaniel Brown",
        "d. undav": "Deniz Undav",
        "v. júnior": "Vinícius Júnior",
        "vinicius junior": "Vinícius Júnior",
        "virgil van dijk": "Virgil van Dijk",
        "c. summerville": "Crysencio Summerville",
        "k. nakamura": "Keito Nakamura",
        "k. ogawa": "Koki Ogawa",
        "y.ayari": "Yasin Ayari",
        "a. isak": "Alexander Isak",
        "maurício": "Maurício"
    };

    while ((match = re.exec(s)) !== null) {
        const entry = match[1].trim();
        let name = entry.replace(/\s+\d+.*$/, '').replace(/\(OG\)/gi, '').replace(/\(p\)/gi, '').trim();
        
        const lowerName = name.toLowerCase();
        if (SCORER_OVERRIDES[lowerName]) {
            name = SCORER_OVERRIDES[lowerName];
        }

        const timeMatch = entry.match(/\d+.*$/);
        const time = timeMatch ? timeMatch[0] : '';
        result.push(`<span class="font-bold">${name}</span> <span class="text-xs text-gray-400">${time}</span>`);
    }
    return result.join(', ');
}

function getProbClass(prob) {
    if (prob > 10) return 'prob-high';
    if (prob > 2) return 'prob-mid';
    return 'prob-low';
}
function getProbBarClass(prob) {
    if (prob > 10) return 'prob-bar-high';
    if (prob > 2) return 'prob-bar-mid';
    return 'prob-bar-low';
}

// Map for long country names → short display names
const SHORT_NAMES = {
    "Democratic Republic of the Congo": "DR Congo",
    "Bosnia and Herzegovina": "Bosnia",
    "United States": "USA",
    "South Korea": "S. Korea",
    "Cape Verde": "Cabo Verde",
    "Saudi Arabia": "Saudi Arabia",
    "Ivory Coast": "Côte d'Ivoire",
    "New Zealand": "New Zealand",
};

function shortName(name) {
    return SHORT_NAMES[name] || name;
}

function get3Code(name) {
    const codes3 = {
        "Spain":"ESP","France":"FRA","England":"ENG","Brazil":"BRA","Argentina":"ARG",
        "Portugal":"POR","Netherlands":"NED","Germany":"GER","Uruguay":"URU","Colombia":"COL",
        "Croatia":"CRO","Belgium":"BEL","Mexico":"MEX","United States":"USA","Japan":"JPN",
        "Morocco":"MAR","Senegal":"SEN","Iran":"IRN","South Korea":"KOR","Canada":"CAN",
        "Australia":"AUS","Ecuador":"ECU","Switzerland":"SUI","Sweden":"SWE","Norway":"NOR",
        "Scotland":"SCO","Qatar":"QAT","Bosnia and Herzegovina":"BIH","Panama":"PAN",
        "Algeria":"ALG","Ghana":"GHA","Egypt":"EGY","Saudi Arabia":"KSA","Curaçao":"CUW",
        "Paraguay":"PAR","Turkey":"TUR","Ivory Coast":"CIV","Jordan":"JOR","Austria":"AUT",
        "Czech Republic":"CZE","New Zealand":"NZL","Democratic Republic of the Congo":"COD",
        "Tunisia":"TUN","Iraq":"IRQ","Uzbekistan":"UZB","Haiti":"HAI","Cape Verde":"CPV",
        "South Africa":"RSA","Denmark":"DEN","Serbia":"SRB","Costa Rica":"CRC","Bolivia":"BOL",
        "TBD":"TBD",
    };
    return codes3[name] || (name || '???').substring(0, 3).toUpperCase();
}

function getCountryCode(name) {
    const map = {
        "Spain":"es","Argentina":"ar","France":"fr","England":"gb-eng","Brazil":"br",
        "Portugal":"pt","Netherlands":"nl","Germany":"de","Uruguay":"uy","Colombia":"co",
        "Croatia":"hr","Belgium":"be","Mexico":"mx","United States":"us","Japan":"jp",
        "Morocco":"ma","Senegal":"sn","Iran":"ir","South Korea":"kr","Canada":"ca",
        "Australia":"au","Ecuador":"ec","Switzerland":"ch","Sweden":"se","Norway":"no",
        "Scotland":"gb-sct","Qatar":"qa","Bosnia and Herzegovina":"ba","Panama":"pa",
        "Algeria":"dz","Ghana":"gh","Egypt":"eg","Saudi Arabia":"sa","Curaçao":"cw",
        "Paraguay":"py","Turkey":"tr","Ivory Coast":"ci","Jordan":"jo","Austria":"at",
        "Czech Republic":"cz","New Zealand":"nz","Democratic Republic of the Congo":"cd",
        "Tunisia":"tn","Iraq":"iq","Uzbekistan":"uz","Haiti":"ht","Cape Verde":"cv",
        "South Africa":"za","Denmark":"dk","Serbia":"rs","Costa Rica":"cr","Bolivia":"bo"
    };
    return map[name] || 'xx';
}

function getFlagHtml(name) {
    if (!name || name === 'TBD' || name === 'Unknown') return name || '';
    const code = getCountryCode(name);
    if (code === 'xx') return name;
    return `<img src="https://flagcdn.com/w20/${code}.png" class="inline-block w-[18px] h-[13px] mr-1.5 align-middle shadow-sm rounded-[2px]" alt="${code}"><span>${shortName(name)}</span>`;
}


function buildGroupMap() {
    if (!currentData || !currentData.groups) return;
    Object.keys(currentData.groups).forEach(gName => {
        const g = currentData.groups[gName];
        const teams = Array.isArray(g.teams) ? g.teams : Object.values(g.teams);
        teams.forEach(t => { GROUP_NAME_MAP[t.name] = gName; });
    });
}

// ============ FETCH & RENDER ============

async function fetchPredictions() {
    try {
        const response = await fetch('/api/predictions?t=' + new Date().getTime());
        const data = await response.json();
        if (currentData && currentData.lastUpdate !== data.lastUpdate) flashUpdate();
        currentData = data;
        renderAll();
    } catch (e) {
        console.error("Gagal mengambil data:", e);
    }
}

function flashUpdate() {
    document.body.classList.add('update-flash');
    setTimeout(() => document.body.classList.remove('update-flash'), 1000);
}

function renderAll() {
    try {
        if (!currentData) return;

        const ts = currentData.lastUpdate;
        try {
            const el = document.getElementById('lastUpdate');
            if (el) {
                el.innerText = ts
                    ? new Date(ts).toLocaleString('id-ID', {dateStyle:'medium', timeStyle:'short'})
                    : '-';
            }
        } catch(e) {
            console.warn(e);
        }

        buildGroupMap();
        renderOverview();
        renderRanking();
        renderGroups();
        renderFixtures();
        renderBracketTree();
        renderHistoryChart(currentData.history);
        renderPlayerStats();
        renderOverviewTopScorers();
        renderFullTopScorers();
    } catch(err) {
        document.body.innerHTML = `<div style="color:red; background:black; padding:20px; font-family:monospace; z-index:9999; position:relative; white-space:pre-wrap;">UI CRASH: ${err.message}\n${err.stack}</div>`;
        console.error(err);
    }
}

function gotoMatch(id) {
    switchTab('Fixtures');
    toggleFixtureView('list');
    
    setTimeout(() => {
        const el = document.getElementById('match-' + id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.remove('highlight-pulse');
            void el.offsetWidth;
            el.classList.add('highlight-pulse');
        }
    }, 100);
}

// ============ OVERVIEW ============
function renderOverview() {
    const finalEl = document.getElementById('final');
    if (finalEl) {
        finalEl.innerHTML = (currentData.final || []).map(getFlagHtml).join(" <span class='text-muted mx-2'>vs</span> ");
        finalEl.style.cursor = 'pointer';
        finalEl.onclick = () => switchTab('Ranking');
        finalEl.title = 'Click to see AI Predictions';
    }
    
    const winnerEl = document.getElementById('winner');
    if (winnerEl) {
        winnerEl.innerHTML = currentData.winner ? getFlagHtml(currentData.winner) : '-';
        winnerEl.style.cursor = 'pointer';
        winnerEl.onclick = () => switchTab('Ranking');
    }
    
    const winnerProbEl = document.getElementById('winnerProb');
    if (winnerProbEl) winnerProbEl.innerText = currentData.winnerProb != null ? currentData.winnerProb.toFixed(2) : '-';

    const dhEl = document.getElementById('darkHorses');
    if (dhEl) {
        dhEl.innerHTML = (currentData.darkHorses || []).length > 0
            ? currentData.darkHorses.map(d =>
                `<div class="flex justify-between border-b border-border py-1.5">
                    <span class="font-bold text-sm flex items-center">${getFlagHtml(d.name)}</span>
                    <span class="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">${d.prob.toFixed(2)}% chance</span>
                </div>`).join('')
            : '<div class="text-muted italic text-sm">Tidak ada</div>';
    }

    const flopsEl = document.getElementById('flops');
    if (flopsEl) {
        flopsEl.innerHTML = (currentData.flops || []).length > 0
            ? currentData.flops.map(d =>
                `<div class="flex justify-between border-b border-border py-1.5">
                    <span class="font-bold text-sm flex items-center">${getFlagHtml(d.name)}</span>
                    <span class="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-500/20">${d.prob.toFixed(2)}% (high expectation)</span>
                </div>`).join('')
            : '<div class="text-muted italic text-sm">Semua raksasa sesuai ekspektasi</div>';
    }

    // ---- Awards Preview (new) ----
    const awards = currentData.awards;
    if (awards) {
        // Golden Boot (top scorer)
        const tsEl = document.getElementById('overviewTopScorer');
        if (tsEl && awards.topScorerList && awards.topScorerList.length > 0) {
            const ts = awards.topScorerList[0];
            tsEl.innerHTML = `${getFlagHtml(ts.team)} <span class="ml-1 text-white">${ts.name}</span> <span class="ml-auto text-red-400 font-mono text-xs">${ts.goals} gol</span>`;
            tsEl.className = 'text-sm font-bold text-primary flex items-center gap-1';
        }
        // Golden Ball
        const bpEl = document.getElementById('overviewBestPlayer');
        if (bpEl && awards.bestPlayer && awards.bestPlayer.length > 0) {
            const bp = awards.bestPlayer[0];
            bpEl.innerHTML = `${getFlagHtml(bp.team)} <span class="ml-1 text-white">${bp.name}</span>`;
            bpEl.className = 'text-sm font-bold flex items-center gap-1';
        }
        // Best Young
        const byEl = document.getElementById('overviewBestYoung');
        if (byEl && awards.bestYoung && awards.bestYoung.length > 0) {
            const by = awards.bestYoung[0];
            byEl.innerHTML = `${getFlagHtml(by.team)} <span class="ml-1 text-white">${by.name}</span>`;
            byEl.className = 'text-sm font-bold flex items-center gap-1';
        }
        // Golden Glove
        const bgEl = document.getElementById('overviewBestGK');
        if (bgEl && awards.bestGoalkeeper && awards.bestGoalkeeper.length > 0) {
            const bg = awards.bestGoalkeeper[0];
            bgEl.innerHTML = `${getFlagHtml(bg.team)} <span class="ml-1 text-white">${bg.name}</span>`;
            bgEl.className = 'text-sm font-bold flex items-center gap-1';
        }
    }

    renderTopCarousel();
    renderLiveMatches();
}


function renderTopCarousel() {
    const container = document.getElementById('topCarouselContainer');
    if (!container) return;
    
    if (!currentData || !currentData.allFixtures || currentData.allFixtures.length === 0) {
        container.innerHTML = '<div class="text-sm text-muted italic p-2">Loading matches...</div>';
        return;
    }
    
    // Exactly 2 finished matches, followed by upcoming
    const finished = currentData.allFixtures.filter(m => m.isFinished).sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate)).slice(0, 2).reverse();
    const upcoming = currentData.allFixtures.filter(m => !m.isFinished).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)).slice(0, 15);
    const combined = [...finished, ...upcoming];
    
    container.innerHTML = combined.map(m => {
        const d = new Date(m.utcDate);
        const dateStr = d.toLocaleString('en-GB', {weekday: 'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
        
        let scoreH = m.isFinished ? m.score_h : '-';
        let scoreA = m.isFinished ? m.score_a : '-';
        let statusHtml = m.isFinished ? `<span class="bg-primary/20 text-primary border border-primary/30 px-1 rounded text-[8px] uppercase">FT</span>` : '';
        
        return `
        <div class="min-w-[150px] flex flex-col bg-card border border-border rounded-md p-3 transition-colors hover:border-cgreen cursor-pointer shrink-0 snap-start" onclick="gotoMatch('${m.id}')">
            <div class="flex justify-between items-center text-xs text-gray-300 mb-2 font-mono">
                <span>${dateStr}</span>
                ${statusHtml}
            </div>
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-1.5 font-bold text-sm">
                    <img src="https://flagcdn.com/w20/${getCountryCode(m.home)}.png" onerror="this.style.display='none'" class="w-[18px] h-[13px] rounded-[2px] shadow-sm">
                    <span class="font-mono text-primary tracking-widest text-xs">${get3Code(m.home)}</span>
                </div>
                <div class="font-bold text-base text-primary">${scoreH}</div>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 font-bold text-sm">
                    <img src="https://flagcdn.com/w20/${getCountryCode(m.away)}.png" onerror="this.style.display='none'" class="w-[18px] h-[13px] rounded-[2px] shadow-sm">
                    <span class="font-mono text-primary tracking-widest text-xs">${get3Code(m.away)}</span>
                </div>
                <div class="font-bold text-base text-primary">${scoreA}</div>
            </div>
        </div>`;
    }).join('');

    // Setup scroll buttons
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    if (prevBtn) {
        prevBtn.onclick = () => container.scrollBy({ left: -200, behavior: 'smooth' });
    }
    if (nextBtn) {
        nextBtn.onclick = () => container.scrollBy({ left: 200, behavior: 'smooth' });
    }
}

function renderLiveMatches() {
    const container = document.getElementById('liveMatchesList');
    const upcomingContainer = document.getElementById('upcomingFixturesList');
    
    const now = new Date();
    const todayMatches = (currentData.allFixtures || []).filter(m => {
        if (!m.utcDate) return false;
        const d = new Date(m.utcDate);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const futureMatches = (currentData.allFixtures || [])
        .filter(m => m.utcDate && new Date(m.utcDate) > now && !todayMatches.includes(m))
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        
    const upcomingMatches = futureMatches.slice(0, 5);

    const headerTitleEl = document.getElementById('liveMatchesTitle');
    const headerIconEl = document.getElementById('liveMatchesIcon');
    const headerContainer = document.getElementById('liveMatchesHeader');

    const t = translations[currentLang];

    if (todayMatches.length === 0) {
        if (headerTitleEl) headerTitleEl.textContent = t.header_recent;
        if (headerIconEl) {
            headerIconEl.textContent = '🏁';
            headerIconEl.classList.remove('animate-pulse', 'text-red-500');
            headerIconEl.classList.add('text-gray-500');
        }
        if (headerContainer) headerContainer.classList.remove('text-gray-500');
        
        const recentMatches = (currentData.allFixtures || [])
            .filter(m => m.isFinished)
            .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
            .slice(0, 4);
            
        if (container) {
            if (recentMatches.length > 0) {
                container.innerHTML = recentMatches.map(m => buildFixtureCard(m)).join('');
            } else {
                container.innerHTML = `<div class="text-gray-500 italic text-sm py-4">${t.msg_nomatches}</div>`;
            }
        }
    } else {
        if (headerTitleEl) headerTitleEl.textContent = t.header_live;
        if (headerIconEl) {
            headerIconEl.textContent = '🔴';
            headerIconEl.classList.add('animate-pulse', 'text-red-500');
            headerIconEl.classList.remove('text-gray-500');
        }
        if (headerContainer) headerContainer.classList.remove('text-gray-500');
        
        if (container) {
            container.innerHTML = todayMatches.map(m => {
                const isLiveBadge = m.isLive ? '<span class="animate-pulse bg-red-600 px-2 py-0.5 rounded text-xs font-bold text-white shadow-[0_0_8px_rgba(220,38,38,0.6)]">LIVE</span>' : '';
                const time = new Date(m.utcDate).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
                const grpLabel = GROUP_NAME_MAP[m.home] ? `Grup ${GROUP_NAME_MAP[m.home].replace('Group ', '')}` : m.stage.replace(/_/g,' ');
                const hs = m.home_scorers && m.home_scorers !== 'null' ? formatScorerDisplay(m.home_scorers) : '';
                const as_ = m.away_scorers && m.away_scorers !== 'null' ? formatScorerDisplay(m.away_scorers) : '';
                const scorersHtml = (hs || as_) ? `
                    <div class="mt-2 pt-2 border-t border-gray-800 text-xs text-gray-300 space-y-0.5">
                        ${hs ? `<div>⚽ <b>${m.home}:</b> ${hs}</div>` : ''}
                        ${as_ ? `<div>⚽ <b>${m.away}:</b> ${as_}</div>` : ''}
                    </div>` : '';

                return `
                    <div class="bg-gray-900/80 border border-gray-700/50 p-4 rounded-xl hover:border-cyan-600 transition-colors cursor-pointer" onclick="switchTab('Fixtures'); gotoMatch('${m.id}')">
                        <div class="text-xs text-gray-400 mb-1 flex justify-between items-center">
                            <span class="text-cyan-700 font-bold uppercase tracking-widest text-[10px]">${grpLabel}</span>
                            <span class="flex items-center gap-2">${isLiveBadge} <span class="font-mono">${time} WIT</span></span>
                        </div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-bold text-base flex items-center">${getFlagHtml(m.home)}</span>
                            <span class="font-bold text-xl ${m.isFinished ? 'text-yellow-400' : 'text-gray-500'}">${m.score_h != null ? m.score_h : '-'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-base flex items-center">${getFlagHtml(m.away)}</span>
                            <span class="font-bold text-xl ${m.isFinished ? 'text-yellow-400' : 'text-gray-500'}">${m.score_a != null ? m.score_a : '-'}</span>
                        </div>
                        ${scorersHtml}
                    </div>`;
            }).join('');
        }
    }

    if (upcomingContainer) {
        if (upcomingMatches.length === 0) {
            upcomingContainer.innerHTML = '<div class="text-gray-500 italic text-sm text-center py-4">Turnamen Selesai</div>';
        } else {
            upcomingContainer.innerHTML = upcomingMatches.map(m => {
                const matchDate = new Date(m.utcDate);
                const dayStr   = matchDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                const timeStr  = matchDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const grpLabel = GROUP_NAME_MAP[m.home]
                    ? (currentLang === 'id' ? 'Grup ' : 'Group ') + GROUP_NAME_MAP[m.home].replace('Group ', '')
                    : m.stage.replace(/_/g, ' ');
                const flagHome = `<img src="https://flagcdn.com/16x12/${getCountryCode(m.home)}.png" onerror="this.style.display='none'" class="inline rounded-[1px] mr-1 opacity-90">`;
                const flagAway = `<img src="https://flagcdn.com/16x12/${getCountryCode(m.away)}.png" onerror="this.style.display='none'" class="inline rounded-[1px] mr-1 opacity-90">`;
                return `
                    <div class="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-2.5 hover:border-cyan-600/60 transition-all cursor-pointer shadow-sm group" onclick="switchTab('Fixtures'); gotoMatch('${m.id}')">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                ${flagHome}<span class="font-semibold text-xs text-white truncate">${m.home}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                ${flagAway}<span class="font-semibold text-xs text-white truncate">${m.away}</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end shrink-0 text-right">
                            <span class="text-[10px] font-mono text-cyan-400 font-bold">${timeStr}</span>
                            <span class="text-[9px] text-muted mt-0.5 uppercase tracking-wider">${dayStr}</span>
                            <span class="text-[8px] text-cyan-700/80 font-mono uppercase mt-0.5">${grpLabel}</span>
                        </div>
                    </div>`;
            }).join('');
        }
    }
}

function setTrendBasis(basis) {
    const hiddenSelect = document.getElementById('trendBasisSelect');
    if (hiddenSelect) hiddenSelect.value = basis;
    
    const btnLast = document.getElementById('trendBasisLast');
    const btnFirst = document.getElementById('trendBasisFirst');
    const activeClass = "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-cyan-600/30 text-cyan-300 border border-cyan-500/30".split(" ");
    const inactiveClass = "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors text-gray-400 hover:text-white".split(" ");
    
    if (basis === 'last') {
        btnLast.classList.remove(...inactiveClass); btnLast.classList.add(...activeClass);
        btnFirst.classList.remove(...activeClass); btnFirst.classList.add(...inactiveClass);
    } else {
        btnFirst.classList.remove(...inactiveClass); btnFirst.classList.add(...activeClass);
        btnLast.classList.remove(...activeClass); btnLast.classList.add(...inactiveClass);
    }
    renderRanking();
}

function renderRanking() {
    const tbody = document.getElementById('rankingTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const maxProb = (currentData.globalRanking[0] || {winProb: 100}).winProb;

    const searchInput = document.getElementById('rankingSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    const trendBasis = document.getElementById('trendBasisSelect') ? document.getElementById('trendBasisSelect').value : 'last';
    const history = currentData.history || [];
    
    let refSnapshot = null;
    if (history.length > 1) {
        if (trendBasis === 'first') {
            refSnapshot = history[0];
        } else {
            const currentFinished = history[history.length - 1].finishedCount;
            if (currentFinished !== undefined) {
                for (let i = history.length - 2; i >= 0; i--) {
                    if (history[i].finishedCount !== undefined && history[i].finishedCount < currentFinished) {
                        refSnapshot = history[i];
                        break;
                    }
                }
            }
            if (!refSnapshot) refSnapshot = history[history.length - 2];
        }
    }

    (currentData.globalRanking || []).forEach((team, idx) => {
        if(query && !team.name.toLowerCase().includes(query)) return;

        if (!query) {
            if (idx === 0) {
                tbody.innerHTML += `<tr><td colspan="5" class="py-2 text-center text-[10px] uppercase tracking-widest text-yellow-500 font-bold bg-yellow-900/20 border-y border-yellow-500/20">👑 Tier 1: The Favorites</td></tr>`;
            } else if (idx === 5) {
                tbody.innerHTML += `<tr><td colspan="5" class="py-2 text-center text-[10px] uppercase tracking-widest text-cyan-400 font-bold bg-cyan-900/20 border-y border-cyan-500/20">🚀 Tier 2: Dark Horses & Contenders</td></tr>`;
            } else if (idx === 12) {
                tbody.innerHTML += `<tr><td colspan="5" class="py-2 text-center text-[10px] uppercase tracking-widest text-muted font-bold bg-muted/10 border-y border-border">🛡️ Tier 3: The Underdogs</td></tr>`;
            }
        }

        const width = Math.max(2, (team.winProb / maxProb) * 100);
        const grp = GROUP_NAME_MAP[team.name] ? `<span class="text-[10px] text-muted ml-1 opacity-60">(Grp ${GROUP_NAME_MAP[team.name]})</span>` : '';
        const prev = PREV_PROBS[team.name] !== undefined ? PREV_PROBS[team.name] : team.winProb;
        PREV_PROBS[team.name] = team.winProb;
        
        let trendHtml = `<span class="text-muted font-mono text-xs opacity-50">-</span>`;
        if (refSnapshot && refSnapshot.ranking) {
            const refTeam = refSnapshot.ranking.find(r => r.name === team.name);
            if (refTeam) {
                const diff = team.winProb - refTeam.winProb;
                if (diff > 0) {
                    trendHtml = `<span class="text-lime font-mono text-xs font-bold">▲ +${diff.toFixed(2)}%</span>`;
                } else if (diff < 0) {
                    trendHtml = `<span class="text-magenta font-mono text-xs font-bold">▼ ${diff.toFixed(2)}%</span>`;
                }
            }
        }
        
        tbody.innerHTML += `
            <tr class="hover:bg-muted/10 transition-colors border-b border-border">
                <td class="py-2 pl-4 text-muted font-mono text-xs opacity-80">${idx + 1}</td>
                <td class="py-2 font-bold text-sm">
                    <div class="flex items-center gap-2">
                        <img src="https://flagcdn.com/16x12/${getCountryCode(team.name)}.png" onerror="this.style.display='none'" class="rounded-[1px] opacity-90"/>
                        <span class="text-primary">${team.name}</span>${grp}
                    </div>
                </td>
                <td class="py-2 font-mono text-cyan-400 text-xs">${Math.round(team.elo)}</td>
                <td class="py-2 text-right">${trendHtml}</td>
                <td class="py-2 pr-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <div class="w-24 bg-background rounded-full h-1.5 overflow-hidden border border-border">
                            <div class="h-1.5 rounded-full progress-bar-fill ${getProbBarClass(team.winProb)}" style="width:${width}%"></div>
                        </div>
                        <span class="font-mono text-xs w-12 text-right ${getProbClass(team.winProb)} animate-prob" data-prev="${prev}" data-target="${team.winProb}">${team.winProb.toFixed(2)}%</span>
                    </div>
                </td>
            </tr>`;
    });

    document.querySelectorAll('.animate-prob').forEach(el => {
        const start = parseFloat(el.getAttribute('data-prev'));
        const end = parseFloat(el.getAttribute('data-target'));
        animateValue(el, start, end, 1200);
    });
}

function renderGroups() {
    const container = document.getElementById('groupsContainer');
    if(!container) return;
    const searchInput = document.getElementById('groupsSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    container.innerHTML = `<div class="col-span-full mb-2 flex gap-6 text-[10px] uppercase tracking-widest font-bold text-muted items-center">
        <span><span class="text-lime">●</span> Auto Qualify (Top 2)</span>
        <span><span class="text-yellow-400">●</span> Potential (Best 3rd)</span>
        <span><span class="text-red-500">●</span> Eliminated</span>
    </div>`;

    Object.keys(currentData.groups).sort().forEach(gName => {
        const g = currentData.groups[gName];
        const teams = Array.isArray(g.teams) ? g.teams : Object.values(g.teams);
        
        if (query) {
            const hasMatch = teams.some(t => t.name.toLowerCase().includes(query));
            if (!hasMatch) return;
        }

        teams.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return (b.qualProb || 0) - (a.qualProb || 0);
        });

        let html = `
            <div class="bg-card border border-border rounded-sm p-4 cursor-pointer hover:border-cyan-500/50 transition-colors shadow-sm" onclick="switchTab('Fixtures')">
                <h3 class="text-lg font-bold mb-3 text-primary flex items-center gap-2"><span class="text-cyan-400">Grup ${gName.replace('Group ', '')}</span></h3>
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="text-muted border-b border-border text-[9px] uppercase tracking-wider">
                            <th class="pb-1">Tim</th>
                            <th class="pb-1 text-center">M</th>
                            <th class="pb-1 text-center">SG</th>
                            <th class="pb-1 text-center">Pts</th>
                            <th class="pb-1 text-right">Lolos%</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">`;

        teams.forEach((t, idx) => {
            const colorClass = idx < 2 ? 'text-lime' : idx === 2 ? 'text-yellow-400' : 'text-muted';
            const flag = `<img src="https://flagcdn.com/16x12/${getCountryCode(t.name)}.png" onerror="this.style.display='none'" class="inline rounded-[1px] mr-1.5 opacity-90"/>`;
            html += `
                <tr class="hover:bg-muted/10 transition-colors">
                    <td class="py-1.5 font-bold ${colorClass} max-w-[100px] sm:max-w-[140px] truncate" title="${t.name}">${flag}${t.name}</td>
                    <td class="py-1.5 text-center text-primary font-mono text-xs opacity-80">${t.played}</td>
                    <td class="py-1.5 text-center text-primary font-mono text-xs opacity-80">${t.goalDifference > 0 ? '+'+t.goalDifference : t.goalDifference}</td>
                    <td class="py-1.5 text-center font-bold font-mono text-cyan-400 text-sm">${t.points}</td>
                    <td class="py-1.5 text-right font-mono text-xs ${getProbClass(t.qualProb)}">${t.qualProb ? t.qualProb.toFixed(1)+'%' : '-'}</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML += html;
    });
}
// ============ FIXTURES & CALENDAR ============

function renderFixtures() {
    setupFixturePillNav();
    renderFixturesList();
}

function setupFixturePillNav() {
    const nav = document.getElementById('fixturePillNav');
    if (!nav) return;
    
    const pills = [
        { id: 'All', label: 'All Matches' },
        { id: 'GROUP_STAGE', label: 'Group Stage' },
        { id: 'LAST_32', label: 'Round of 32' },
        { id: 'LAST_16', label: 'Round of 16' },
        { id: 'QUARTER_FINALS', label: 'Quarter-finals' },
        { id: 'SEMI_FINALS', label: 'Semi-finals' },
        { id: 'FINAL', label: 'Final' }
    ];
    
    nav.innerHTML = pills.map(p => `
        <button onclick="setFixturePill('${p.id}', '${p.label}')" class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${currentFixturePill === p.id ? 'bg-cyan-600 text-white shadow-md border border-cyan-400' : 'bg-background border border-border text-muted hover:text-white hover:border-cyan-800'}">
            ${p.label}
        </button>
    `).join('');
}

function setFixturePill(id, label) {
    currentFixturePill = id;
    setupFixturePillNav();
    const title = document.getElementById('fixturesSectionTitle');
    if(title) title.innerText = label;
    renderFixtures();
}

function renderFixturesList() {
    const container = document.getElementById('fixturesListContainer');
    if (!container) return;
    
    if (!currentData || !currentData.allFixtures) {
        container.innerHTML = '<div class="text-center p-8 text-muted italic">Data matches tidak tersedia.</div>';
        return;
    }

    const searchInput = document.getElementById('fixtureSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    let matches = currentData.allFixtures.filter(m => {
        if(statusFilter === 'results' && !m.isFinished) return false;
        if(statusFilter === 'upcoming' && m.isFinished) return false;
        if(currentFixturePill !== 'All' && m.stage !== currentFixturePill) return false;
        if(query) return m.home.toLowerCase().includes(query) || m.away.toLowerCase().includes(query) || (m.group && m.group.toLowerCase().includes(query));
        return true;
    });

    if (matches.length === 0) {
        container.innerHTML = `<div class="p-8 text-center bg-card rounded border border-border text-muted">Tidak ada pertandingan yang cocok.</div>`;
        return;
    }

    // Group by Date
    const groupsMap = {};
    matches.forEach(m => {
        let dateLabel = 'Unknown Date';
        if (m.utcDate) {
            const d = new Date(m.utcDate);
            if (!isNaN(d)) {
                dateLabel = d.toLocaleString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
            }
        }
        if(!groupsMap[dateLabel]) groupsMap[dateLabel] = [];
        groupsMap[dateLabel].push(m);
    });

    // Sort the dates
    let sortedDateLabels = Object.keys(groupsMap);
    if (statusFilter === 'results') {
        // Latest date first
        sortedDateLabels.sort((a, b) => {
            return new Date(groupsMap[b][0].utcDate) - new Date(groupsMap[a][0].utcDate);
        });
    } else {
        // Earliest date first
        sortedDateLabels.sort((a, b) => {
            return new Date(groupsMap[a][0].utcDate) - new Date(groupsMap[b][0].utcDate);
        });
    }

    // Render grouped by date vertically
    container.innerHTML = sortedDateLabels.map(dateLabel => {
        // For results, we also want the matches inside the date to be latest first if needed, 
        // but chronological within a day is usually fine.
        return `
        <div class="mb-8">
            <h3 class="text-lg font-black text-primary mb-4 text-center border-b border-border/50 pb-2">${dateLabel}</h3>
            <div class="space-y-4">
                ${groupsMap[dateLabel].map(m => buildFixtureCard(m)).join('')}
            </div>
        </div>`;
    }).join('');
}

function setStatusFilter(filter) {
    statusFilter = filter;
    
    // Update button styling
    const resBtn = document.getElementById('toggleResultsBtn');
    const upcBtn = document.getElementById('toggleUpcomingBtn');
    
    if (filter === 'results') {
        resBtn.className = "px-6 py-1.5 rounded-full text-sm font-bold transition-all text-white bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)] border border-cyan-500/30";
        upcBtn.className = "px-6 py-1.5 rounded-full text-sm font-bold transition-all text-muted hover:text-white border border-transparent";
    } else {
        upcBtn.className = "px-6 py-1.5 rounded-full text-sm font-bold transition-all text-white bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)] border border-cyan-500/30";
        resBtn.className = "px-6 py-1.5 rounded-full text-sm font-bold transition-all text-muted hover:text-white border border-transparent";
    }
    
    renderFixturesList();
    renderFixturesCalendar();
}

function buildFixtureCard(m) {
    const hs = m.home_scorers && m.home_scorers !== 'null' ? formatScorerDisplay(m.home_scorers) : '';
    const as_ = m.away_scorers && m.away_scorers !== 'null' ? formatScorerDisplay(m.away_scorers) : '';
    
    const hasScorers = hs || as_;
    const scorersHtml = hasScorers ? `
        <div class="w-full mt-3 pt-3 border-t border-border/50 text-[11px] text-muted flex justify-between px-4">
            <div class="text-left flex-1">${hs ? `⚽ ${hs}` : ''}</div>
            <div class="text-right flex-1">${as_ ? `⚽ ${as_}` : ''}</div>
        </div>` : '';
        
    const timeStr = new Date(m.utcDate).toLocaleString('en-GB', {hour:'2-digit', minute:'2-digit'});
    const statusText = m.isFinished ? 'FT' : timeStr;
    const isLive = !m.isFinished && m.score_h !== null; // Rough heuristic for live

    return `
        <div id="match-${m.id}" class="bg-card/50 px-2 py-4 md:px-6 md:py-5 rounded flex flex-col border border-border/40 hover:bg-card hover:border-cyan-900/50 transition-all duration-300">
            <div class="flex items-center justify-between w-full max-w-2xl mx-auto mb-1">
                <div class="flex items-center justify-end flex-1 gap-3">
                    <span class="font-bold text-sm md:text-lg text-primary truncate max-w-[120px] md:max-w-[180px] text-right">${m.home}</span>
                    <span class="shrink-0 scale-125">${getFlagHtml(m.home).replace(`<span>${m.home}</span>`, '')}</span>
                </div>
                
                <div class="flex items-center justify-center gap-2 md:gap-4 px-2 md:px-6 w-24 md:w-40 shrink-0">
                    <span class="font-black text-xl md:text-2xl ${m.isFinished ? 'text-primary' : 'text-muted/50'}">${m.score_h !== null ? m.score_h : '-'}</span>
                    <div class="flex flex-col items-center justify-center bg-background border border-border/50 rounded px-2 py-1 min-w-[36px]">
                        <span class="text-[10px] md:text-xs font-bold text-gray-300 ${isLive ? 'text-red-500 animate-pulse' : ''}">${statusText}</span>
                    </div>
                    <span class="font-black text-xl md:text-2xl ${m.isFinished ? 'text-primary' : 'text-muted/50'}">${m.score_a !== null ? m.score_a : '-'}</span>
                </div>
                
                <div class="flex items-center justify-start flex-1 gap-3">
                    <span class="shrink-0 scale-125">${getFlagHtml(m.away).replace(`<span>${m.away}</span>`, '')}</span>
                    <span class="font-bold text-sm md:text-lg text-primary truncate max-w-[120px] md:max-w-[180px] text-left">${m.away}</span>
                </div>
            </div>
            
            <div class="text-[10px] text-gray-400 text-center mt-2 opacity-80 font-mono tracking-wider uppercase">
                ${m.stage ? m.stage.replace(/_/g, ' ') : 'Unknown Stage'} • ${m.stadium || 'Stadion TBD'}
            </div>
            
            ${scorersHtml}
        </div>`;
}

function renderFixturesCalendar() {
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    grid.innerHTML = '';
    const searchInput = document.getElementById('fixtureSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    const activeFilter = window.statusFilter || statusFilter;
    if (!currentData.allFixtures || currentData.allFixtures.length === 0) return;

    const start = new Date(2026, 5, 11);
    const end = new Date(2026, 6, 19);
    const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    days.forEach(d => { grid.innerHTML += `<div class="font-bold text-muted py-2 border-b border-border text-[10px] uppercase tracking-widest">${d}</div>`; });
    for (let i = 0; i < start.getDay(); i++) grid.innerHTML += `<div class="p-1 opacity-5"></div>`;

    let curr = new Date(start);
    while (curr <= end) {
        const matchesToday = currentData.allFixtures.filter(m => {
            if(activeFilter === 'results' && !m.isFinished) return false;
            if(activeFilter === 'upcoming' && m.isFinished) return false;
            if (!m.utcDate) return false;
            const d = new Date(m.utcDate);
            const isSameDay = d.getDate() === curr.getDate() && d.getMonth() === curr.getMonth() && d.getFullYear() === curr.getFullYear();
            if(!isSameDay) return false;
            if(query) return m.home.toLowerCase().includes(query) || m.away.toLowerCase().includes(query) || (m.group && m.group.toLowerCase().includes(query));
            return true;
        });
        const matchHtml = matchesToday.map(m => {
            const hh = new Date(m.utcDate).getHours().toString().padStart(2,'0');
            const mm = new Date(m.utcDate).getMinutes().toString().padStart(2,'0');
            const cls = m.isFinished ? 'bg-muted/10 border-border text-muted opacity-80' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold';
            
            const hCode = getCountryCode(m.home);
            const aCode = getCountryCode(m.away);
            const hFlag = hCode !== 'xx' ? `<img src="https://flagcdn.com/16x12/${hCode}.png" class="inline w-3 h-2 mx-0.5 rounded-[1px]" alt="${m.home}">` : '';
            const aFlag = aCode !== 'xx' ? `<img src="https://flagcdn.com/16x12/${aCode}.png" class="inline w-3 h-2 mx-0.5 rounded-[1px]" alt="${m.away}">` : '';
            const grp = GROUP_NAME_MAP[m.home] ? `Grp ${GROUP_NAME_MAP[m.home]}` : m.stage.substring(0,2).toUpperCase();

            return `<div class="text-[9px] ${cls} rounded mb-1.5 px-1 py-1 border cursor-pointer hover:border-cyan-500 transition-colors shadow-sm text-center"
                title="${m.home} vs ${m.away}" onclick="gotoMatch('${m.id}')">
                <div class="font-mono mb-0.5 text-[8px] opacity-60">${hh}:${mm} &bull; ${grp}</div>
                <div class="flex items-center justify-center font-bold">
                    <span class="mr-1">${m.home.substring(0,3).toUpperCase()}</span>${hFlag}
                    <span class="text-[8px] mx-1 opacity-50">v</span>
                    ${aFlag}<span class="ml-1">${m.away.substring(0,3).toUpperCase()}</span>
                </div>
            </div>`;
        }).join('');
        grid.innerHTML += `
            <div class="p-1 min-h-[80px] border border-border bg-card rounded flex flex-col hover:bg-muted/5 transition-colors">
                <div class="text-[10px] text-right text-muted font-bold mb-2">${curr.getDate()} ${curr.toLocaleString('en',{month:'short'})}</div>
                ${matchHtml}
            </div>`;
        curr.setDate(curr.getDate() + 1);
    }
}

function toggleFixtureView(view) {
    const list = document.getElementById('fixturesListContainer');
    const cal = document.getElementById('fixturesCalendarContainer');
    const btnList = document.getElementById('btnListView');
    const btnCal = document.getElementById('btnCalView');
    if (view === 'list') {
        list.classList.remove('hidden'); cal.classList.add('hidden');
        btnList.className = "px-4 py-1.5 rounded-sm bg-primary text-background text-sm font-bold transition-colors shadow-sm";
        btnCal.className = "px-4 py-1.5 rounded-sm text-muted text-sm font-semibold hover:text-primary transition-colors";
    } else {
        list.classList.add('hidden'); cal.classList.remove('hidden');
        btnCal.className = "px-4 py-1.5 rounded-sm bg-primary text-background text-sm font-bold transition-colors shadow-sm";
        btnList.className = "px-4 py-1.5 rounded-sm text-muted text-sm font-semibold hover:text-primary transition-colors";
    }
}

function renderBracketTree() {
    const container = document.getElementById('bracketContainer');
    if(!container) return;
    container.innerHTML = '';
    if (!currentData.bracket || currentData.bracket.length === 0) return;

    const stageLabels = {LAST_32:'Round of 32', LAST_16:'Round of 16', QUARTER_FINALS:'Quarter Finals', SEMI_FINALS:'Semi Finals', FINAL:'Final'};
    const TOTAL_H = 900; // px — total height of bracket area (not counting header row)
    const CARD_W = 200;  // px
    const CARD_H = 80;   // px approximate card height
    const COL_W = 220;   // px per column
    const COL_GAP = 24;  // px gap between columns

    // Build stage order: L32 L16 LQF LSF  FINAL  RSF RQF R16 R32
    const leftStages = [];
    const rightStages = [];
    let finalMatches = [];

    currentData.bracket.forEach(stageObj => {
        if (stageObj.stage === 'THIRD_PLACE') return;
        const stageMatches = stageObj.matches;
        if (!stageMatches || stageMatches.length === 0) return;

        if (stageObj.stage === 'FINAL') {
            finalMatches = stageMatches;
        } else {
            const half = Math.ceil(stageMatches.length / 2);
            leftStages.push({ stage: stageObj.stage, label: stageLabels[stageObj.stage] || stageObj.stage, matches: stageMatches.slice(0, half) });
            rightStages.push({ stage: stageObj.stage, label: stageLabels[stageObj.stage] || stageObj.stage, matches: stageMatches.slice(half) });
        }
    });

    // rightStages should go from SF→R32 (mirrored)
    rightStages.reverse();

    // Total columns: leftStages + final(1) + rightStages
    const totalCols = leftStages.length + 1 + rightStages.length;
    const totalW = totalCols * COL_W + (totalCols - 1) * COL_GAP;

    // Helper to get card HTML
    // isR32: boolean indicating if this is Round of 32
    function getCardHtml(m, isR32) {
        if (!m) return '';
        const isOfficial = m.isFinished === true && m.status === 'FINISHED';
        const badge = isOfficial
            ? `<span class="absolute -top-2 -right-2 bg-cgreen text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow z-20">OFFICIAL</span>`
            : `<span class="absolute -top-2 -right-2 bg-background border border-border text-[8px] text-muted px-1.5 py-0.5 rounded shadow z-20">PREDICTED</span>`;

        const homeProb = m.home_prob != null ? m.home_prob.toFixed(1)+'%' : '?%';
        const awayProb = m.away_prob != null ? m.away_prob.toFixed(1)+'%' : '?%';
        const homeScore = m.score_h != null ? m.score_h : homeProb;
        const awayScore = m.score_a != null ? m.score_a : awayProb;
        const homeWin = m.isFinished ? m.score_h > m.score_a : m.home_prob >= m.away_prob;
        const awayWin = m.isFinished ? m.score_a > m.score_h : m.away_prob > m.home_prob;
        const hFlag = m.home && m.home !== 'TBD' ? `<img src="https://flagcdn.com/16x12/${getCountryCode(m.home)}.png" class="inline rounded-sm mr-1.5 opacity-90"/>` : '';
        const aFlag = m.away && m.away !== 'TBD' ? `<img src="https://flagcdn.com/16x12/${getCountryCode(m.away)}.png" class="inline rounded-sm mr-1.5 opacity-90"/>` : '';

        // Transparent flag background for the likely winner
        const winnerTeam = homeWin ? m.home : m.away;
        const winnerCode = getCountryCode(winnerTeam);
        const bgStyle = winnerCode !== 'xx' 
            ? `background-image: url(https://flagcdn.com/w160/${winnerCode}.png); background-size: cover; background-position: center; background-repeat: no-repeat;` 
            : '';

        // Short display names
        const homeDisplay = shortName(m.home || 'TBD');
        const awayDisplay = shortName(m.away || 'TBD');

        let hQual = '', aQual = '';
        if (isR32 && m.home !== 'TBD' && m.away !== 'TBD') {
            const mapPath = (path) => path === 'WINNER' ? '1' : (path === 'RUNNER_UP' ? '2' : '3');
            const hq = mapPath(m.home_path);
            const aq = mapPath(m.away_path);
            const getMedalColor = (q) => q === '1' ? 'bg-yellow-500 text-black' : q === '2' ? 'bg-gray-300 text-black' : 'bg-orange-600 text-white';
            hQual = `<span class="${getMedalColor(hq)} rounded-full w-3.5 h-3.5 flex shrink-0 items-center justify-center text-[8px] font-black mr-1.5 shadow-sm">${hq}</span>`;
            aQual = `<span class="${getMedalColor(aq)} rounded-full w-3.5 h-3.5 flex shrink-0 items-center justify-center text-[8px] font-black mr-1.5 shadow-sm">${aq}</span>`;
        }

        return `
            <div class="relative bg-card border border-border hover:border-cblue transition-colors p-2 rounded flex flex-col shadow-sm w-full overflow-hidden" style="min-height:${CARD_H}px">
                <div class="absolute inset-0 opacity-[0.06] pointer-events-none" style="${bgStyle}"></div>
                ${badge}
                <div class="text-[9px] text-muted mb-1.5 flex justify-between font-mono relative z-10">
                    <span>M${m.id || '?'}</span>
                    ${m.isFinished ? `<span class="text-cgreen font-bold">FT</span>` : ''}
                </div>
                <div class="flex flex-col gap-1 relative z-10">
                    <div class="flex justify-between items-center bg-background/50 px-2 py-1 rounded-sm border border-border/30">
                        <span class="font-bold text-xs ${homeWin ? 'text-primary' : 'text-muted'} truncate flex items-center">${hQual}${hFlag}${homeDisplay}</span>
                        <span class="text-xs font-mono ml-2 font-bold ${m.isFinished && homeWin ? 'text-cgreen' : 'text-muted'}">${homeScore}</span>
                    </div>
                    <div class="flex justify-between items-center bg-background/50 px-2 py-1 rounded-sm border border-border/30">
                        <span class="font-bold text-xs ${awayWin ? 'text-primary' : 'text-muted'} truncate flex items-center">${aQual}${aFlag}${awayDisplay}</span>
                        <span class="text-xs font-mono ml-2 font-bold ${m.isFinished && awayWin ? 'text-cgreen' : 'text-muted'}">${awayScore}</span>
                    </div>
                </div>
            </div>`;
    }

    // ---- qualMap logic removed. Relying strictly on m.home_path and m.away_path from predictor.py ----

    // Render one column of matches at exact positions
    function renderAbsoluteColumn(matchList, label, colIndex, side, isR32) {
        const n = matchList.length;
        const slotH = TOTAL_H / n;
        const x = colIndex * (COL_W + COL_GAP);

        let cards = '';
        matchList.forEach((m, i) => {
            const slotTop = i * slotH;
            const cardTop = slotTop + (slotH - CARD_H) / 2;

            let lineHtml = '';
            if (side === 'left' && i % 2 === 0 && i + 1 < n) {
                const topLineY = slotTop + slotH / 2;
                const botLineY = (i + 1) * slotH + slotH / 2;
                const midY = (topLineY + botLineY) / 2;
                lineHtml = `
                    <div style="position:absolute; right:${-COL_GAP/2}px; top:${topLineY}px; width:${COL_GAP/2}px; height:1px; background:rgba(148,163,184,0.35);"></div>
                    <div style="position:absolute; right:${-COL_GAP}px; top:${topLineY}px; width:1px; height:${botLineY - topLineY}px; background:rgba(148,163,184,0.35);"></div>
                    <div style="position:absolute; right:${-COL_GAP/2}px; top:${botLineY}px; width:${COL_GAP/2}px; height:1px; background:rgba(148,163,184,0.35);"></div>
                    <div style="position:absolute; right:${-COL_GAP}px; top:${midY}px; width:${COL_GAP/2}px; height:1px; background:rgba(148,163,184,0.35);"></div>`;
            } else if (side === 'right' && i % 2 === 0 && i + 1 < n) {
                const topLineY = slotTop + slotH / 2;
                const botLineY = (i + 1) * slotH + slotH / 2;
                const midY = (topLineY + botLineY) / 2;
                lineHtml = `
                    <div style="position:absolute; left:${-COL_GAP/2}px; top:${topLineY}px; width:${COL_GAP/2}px; height:1px; background:rgba(148,163,184,0.35);"></div>
                    <div style="position:absolute; left:${-COL_GAP}px; top:${topLineY}px; width:1px; height:${botLineY - topLineY}px; background:rgba(148,163,184,0.35);"></div>
                    <div style="position:absolute; left:${-COL_GAP/2}px; top:${botLineY}px; width:${COL_GAP/2}px; height:1px; background:rgba(148,163,184,0.35);"></div>
                    <div style="position:absolute; left:${-COL_GAP}px; top:${midY}px; width:${COL_GAP/2}px; height:1px; background:rgba(148,163,184,0.35);"></div>`;
            }

            cards += `
                <div style="position:absolute; top:${cardTop}px; left:0; right:0;">
                    ${getCardHtml(m, isR32)}
                </div>
                ${lineHtml}`;
        });

        return `
            <div style="position:absolute; left:${x}px; top:0; width:${COL_W}px; height:${TOTAL_H}px;">
                ${cards}
            </div>`;
    }

    let html = '';
    // Left columns: L32 → LSF
    leftStages.forEach((s, i) => {
        const isR32 = s.stage === 'LAST_32';
        html += renderAbsoluteColumn(s.matches, s.label, i, 'left', isR32);
    });

    // Final column (center)
    const finalColIdx = leftStages.length;
    const finalSlotH = TOTAL_H;
    const finalCardTop = (finalSlotH - CARD_H) / 2;
    const finalX = finalColIdx * (COL_W + COL_GAP);
    html += `
        <div style="position:absolute; left:${finalX}px; top:0; width:${COL_W}px; height:${TOTAL_H}px;">
            <div style="position:absolute; top:${finalCardTop}px; left:0; right:0; border:2px solid rgba(230,29,37,0.7); border-radius:8px;">
                ${getCardHtml(finalMatches[0])}
            </div>
        </div>`;

    // Right columns: RSF → R32
    rightStages.forEach((s, i) => {
        const colIdx = finalColIdx + 1 + i;
        const isR32 = s.stage === 'LAST_32';
        html += renderAbsoluteColumn(s.matches, s.label, colIdx, 'right', isR32);
    });

    // Build label row
    const allCols = [...leftStages.map(s => s.label), 'Final', ...rightStages.map(s => s.label)];
    const labelHtml = allCols.map((lbl, i) => {
        const lx = i * (COL_W + COL_GAP);
        return `<div style="position:absolute; left:${lx}px; width:${COL_W}px; text-align:center;" class="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">${lbl}</div>`;
    }).join('');

    // ---- Final Summary Banner ----
    const fm = finalMatches[0];
    const winnerTeam = fm && fm.home_prob >= fm.away_prob ? fm.home : (fm ? fm.away : '?');
    const winnerProb = fm ? Math.max(fm.home_prob || 0, fm.away_prob || 0).toFixed(1) : '?';
    const winnerFlagCode = getCountryCode(winnerTeam);
    const finalSummary = fm ? `
        <div style="background: linear-gradient(135deg, rgba(42,57,141,0.3) 0%, rgba(230,29,37,0.2) 100%); border: 1px solid rgba(230,29,37,0.4); border-radius: 10px; padding: 14px 20px; margin-bottom: 16px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">⚔️</span>
                <div>
                    <div style="font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:2px;">Predicted Final</div>
                    <div style="font-size:14px; font-weight:800; color:#f1f5f9;">${shortName(fm.home)} <span style="color:#6b7280; font-weight:400;">vs</span> ${shortName(fm.away)}</div>
                </div>
            </div>
            <div style="width:1px; height:36px; background:rgba(148,163,184,0.2);"></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">🏆</span>
                <div>
                    <div style="font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:2px;">Predicted Champion</div>
                    <div style="font-size:14px; font-weight:800; color:#fbbf24; display:flex; align-items:center; gap:6px;">
                        <img src="https://flagcdn.com/w20/${winnerFlagCode}.png" style="border-radius:2px; height:13px;"/>
                        ${shortName(winnerTeam)}
                        <span style="font-size:10px; color:#94a3b8; font-weight:400;">(${winnerProb}%)</span>
                    </div>
                </div>
            </div>
        </div>` : '';

    const LABEL_H = 28;
    container.style.cssText = `position:relative; width:${totalW}px; margin: 0 auto;`;
    container.innerHTML = `
        ${finalSummary}
        <div style="position:relative; width:${totalW}px; height:${LABEL_H}px; margin-bottom: 12px;">${labelHtml}</div>
        <div style="position:relative; width:${totalW}px; height:${TOTAL_H}px;">${html}</div>`;
}






// ============ HISTORY CHART ============

function updateChartTeams() {
    const sel = document.getElementById('chartTeamSelect');
    if (sel) chartMode = sel.value;
    if (currentData && currentData.history) renderHistoryChart(currentData.history);
}

function renderHistoryChart(historyData) {
    if (!historyData || historyData.length === 0) return;
    const ctx = document.getElementById('probabilityChart').getContext('2d');

    const allTeams = historyData[historyData.length - 1].ranking.map(r => r.name);
    const teamsToShow = chartMode === 'top5' ? allTeams.slice(0, 5) : allTeams;
    
    const presetColors = ['#38bdf8','#fbbf24','#f87171','#34d399','#a78bfa'];

    const datasets = teamsToShow.map((name, i) => {
        const color = i < presetColors.length ? presetColors[i] : `hsl(${(i * 137.5) % 360}, 70%, 60%)`;
        return {
            label: name,
            data: historyData.map(snap => {
                const t = snap.ranking.find(r => r.name === name);
                return t ? parseFloat(t.winProb.toFixed(2)) : null;
            }),
            borderColor: color,
            backgroundColor: color + '30',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: chartMode === 'top5' ? 3 : 0, // hide points if all teams to avoid clutter
            pointHoverRadius: 6,
            fill: false,
            hidden: chartMode === 'all' && i >= 5 // Hide non-top 5 by default when viewing all, user can toggle
        };
    });

    const labels = historyData.map(h => {
        try { return new Date(h.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}); }
        catch(e) { return h.timestamp.substring(11,16); }
    });

    if (probChart) probChart.destroy();

    probChart = new Chart(ctx, {
        type: 'line',
        data: {labels, datasets},
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {mode:'index', intersect: false},
            plugins: {
                legend: {
                    labels: {color:'#cbd5e1', font:{family:'Outfit', size:11}},
                },
                tooltip: {
                    callbacks: {label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`}
                }
            },
            scales: {
                y: {
                    grid: {color:'rgba(255,255,255,0.05)'},
                    ticks: {color:'#94a3b8', callback: v => v.toFixed(2)+'%'}
                },
                x: {grid: {display:false}, ticks: {color:'#94a3b8'}}
            }
        }
    });
}

// ============ PLAYER STATS ============
function renderTopScorersTable() {
    const container = document.getElementById('playerStatsBody');
    if (!container) return;

    const scorerMap = {};
    (currentData.allFixtures || []).forEach(m => {
        if (!m.isFinished) return;
        const process = (str, team) => {
            parseScorerStr(str).forEach(name => {
                if (!scorerMap[name]) scorerMap[name] = {goals:0, team};
                scorerMap[name].goals += 1;
            });
        };
        process(m.home_scorers, m.home);
        process(m.away_scorers, m.away);
    });

    const sortedScorers = Object.entries(scorerMap)
        .sort((a, b) => b[1].goals - a[1].goals || a[1].team.localeCompare(b[1].team));

    if (sortedScorers.length === 0) {
        container.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-muted italic">Belum ada data gol.</td></tr>`;
        return;
    }

    // Group by goals
    const groups = {};
    sortedScorers.forEach(([name, data]) => {
        if (!groups[data.goals]) groups[data.goals] = [];
        groups[data.goals].push({name, team: data.team});
    });

    // Render grouped table
    let html = '';
    let rank = 1;
    Object.keys(groups).sort((a,b) => b - a).forEach(goals => {
        const players = groups[goals];
        html += `
        <tr class="bg-card/50 border-b border-border">
            <td class="py-3 pl-4 text-primary font-bold text-sm w-12 text-center align-top" rowspan="${players.length}">${rank}</td>
            <td class="py-2 flex items-center font-bold text-sm text-primary">
                ${getFlagHtml(players[0].team)} <span class="ml-2">${players[0].name}</span>
            </td>
            <td class="py-3 pr-4 text-right text-cyan-400 font-mono font-bold align-top" rowspan="${players.length}">${goals}</td>
        </tr>`;
        
        for (let i = 1; i < players.length; i++) {
            html += `
            <tr class="bg-card/50 border-b border-border">
                <td class="py-2 flex items-center font-bold text-sm text-primary">
                    ${getFlagHtml(players[i].team)} <span class="ml-2">${players[i].name}</span>
                </td>
            </tr>`;
        }
        rank += players.length;
    });

    container.innerHTML = html;
}

// ============ TAB SWITCHING ============
function switchTab(tabId) {
    document.querySelectorAll('[id^="content"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="tab"]').forEach(el => el.classList.remove('active'));
    const content = document.getElementById('content' + tabId);
    const tab = document.getElementById('tab' + tabId);
    if (content) content.classList.remove('hidden');
    if (tab) tab.classList.add('active');
}

function setStandingsView(view) {
    const groupView = document.getElementById('standingsGroupView');
    const tbaView = document.getElementById('standingsTBAView');
    const tabGroups = document.getElementById('tabStandingsGroups');
    const tabTBA = document.getElementById('tabStandingsTBA');
    
    if (view === 'groups') {
        groupView.classList.remove('hidden');
        tbaView.classList.add('hidden');
        tabGroups.className = "px-6 py-3 font-bold text-sm border-b-2 border-cyan-500 text-cyan-400 hover:bg-muted/10 transition-colors whitespace-nowrap";
        tabTBA.className = "px-6 py-3 font-semibold text-sm border-b-2 border-transparent text-muted hover:text-primary hover:bg-muted/10 transition-colors whitespace-nowrap";
    } else {
        tbaView.classList.remove('hidden');
        groupView.classList.add('hidden');
        tabTBA.className = "px-6 py-3 font-bold text-sm border-b-2 border-cyan-500 text-cyan-400 hover:bg-muted/10 transition-colors whitespace-nowrap";
        tabGroups.className = "px-6 py-3 font-semibold text-sm border-b-2 border-transparent text-muted hover:text-primary hover:bg-muted/10 transition-colors whitespace-nowrap";
        renderTBABracket();
    }
}

function renderTBABracket() {
    const container = document.getElementById('tbaBracketContainer');
    if (!container) return;

    // Hardcode the TBA path for a 48-team, 12-group tournament (Round of 32 starting)
    // Actually, drawing scheme depends on 1st, 2nd, and 8 best 3rd places.
    // We'll create a simplified abstract bracket view just displaying the format.
    const rounds = ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
    const r32_matchups = [
        ['1A', '3C/E/F/H/I'], ['2B', '2E'], ['1G', '3A/E/H/I/J'], ['2H', '2J'],
        ['1D', '3B/E/F/I/K'], ['2C', '2F'], ['1J', '3A/B/C/D/L'], ['2I', '2K'],
        ['1E', '3A/B/C/D/F'], ['2A', '2L'], ['1H', '3B/C/E/F/G'], ['2D', '2G'],
        ['1B', '3E/F/G/I/J'], ['1F', '2K'], ['1C', '3A/B/F/G/H'], ['1I', '3C/D/G/H/K'],
        ['1K', '3D/E/A/B/L'], ['1L', '3G/H/I/J/K'] // simplified representation of 16 matches
    ];

    let html = `<div class="flex gap-12 py-8 px-4 bg-background/50 rounded-lg shadow-inner">`;
    rounds.forEach((round, rIdx) => {
        let matchCount = 16 / Math.pow(2, rIdx);
        let colHtml = `<div class="flex flex-col justify-around gap-4 min-h-[500px]">
            <div class="text-[10px] font-bold text-cyan-400 uppercase tracking-widest text-center border-b border-border pb-1">${round}</div>`;
        for (let i = 0; i < matchCount; i++) {
            let label1 = rIdx === 0 && i < r32_matchups.length ? r32_matchups[i][0] : `Winner M${i*2 + 1}`;
            let label2 = rIdx === 0 && i < r32_matchups.length ? r32_matchups[i][1] : `Winner M${i*2 + 2}`;
            colHtml += `
                <div class="flex flex-col bg-card border border-border p-2 rounded shadow-sm w-48 opacity-70">
                    <div class="text-[9px] text-muted font-mono mb-1">M${i+1}</div>
                    <div class="flex justify-between items-center text-xs font-bold text-primary bg-background/50 px-2 py-1 mb-1 rounded-sm">${label1}</div>
                    <div class="flex justify-between items-center text-xs font-bold text-primary bg-background/50 px-2 py-1 rounded-sm">${label2}</div>
                </div>`;
        }
        colHtml += `</div>`;
        html += colHtml;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// ============ PLAYER STATS ============
function renderOverviewTopScorers() {
    const tbody = document.getElementById('playerStatsBodyOverview');
    if (!tbody) return;
    
    if (!currentData || !currentData.awards || !currentData.awards.topScorerList || currentData.awards.topScorerList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-muted italic">Data belum tersedia</td></tr>';
        return;
    }

    // Top 5 scorers only for Overview
    const scorers = currentData.awards.topScorerList.slice(0, 5);
    tbody.innerHTML = scorers.map((s, idx) => {
        const flagImg = s.team && s.team !== 'Unknown' 
            ? `<img src="https://flagcdn.com/16x12/${getCountryCode(s.team)}.png" onerror="this.style.display='none'" class="inline rounded-[1px] mr-1 opacity-90">`
            : '';
        const teamLabel = s.team && s.team !== 'Unknown' ? s.team : '?';
        return `
        <tr class="hover:bg-muted/10 transition-colors border-b border-border">
            <td class="py-2.5 font-mono text-muted text-[10px] w-6 opacity-70">${idx+1}</td>
            <td class="py-2.5 font-bold text-sm">
                <div class="text-primary truncate">${s.name}</div>
                <div class="text-[9px] text-muted font-mono flex items-center gap-1 mt-0.5">${flagImg}</div>
            </td>
            <td class="py-2.5 text-right font-mono font-bold text-cyan-400 text-lg">${s.goals}</td>
        </tr>`;
    }).join('');
}

function renderFullTopScorers() {
    const tbody = document.getElementById('playerStatsBody');
    if (!tbody) return;
    
    if (!currentData || !currentData.awards || !currentData.awards.topScorerList || currentData.awards.topScorerList.length === 0) {
        tbody.innerHTML = '<div class="py-4 text-center text-muted italic">Data belum tersedia</div>';
        return;
    }

    // Group scorers by goals
    const grouped = {};
    currentData.awards.topScorerList.forEach(s => {
        if (!grouped[s.goals]) grouped[s.goals] = [];
        grouped[s.goals].push(s);
    });

    const sortedGoals = Object.keys(grouped).map(Number).sort((a,b) => b-a);

    tbody.innerHTML = sortedGoals.map(goals => {
        const players = grouped[goals];
        
        // Group players by team within the same goal amount
        const playersByTeam = {};
        players.forEach(p => {
            if (!playersByTeam[p.team]) playersByTeam[p.team] = [];
            playersByTeam[p.team].push(p.name);
        });

        // Sort teams alphabetically
        const sortedTeams = Object.keys(playersByTeam).sort((a,b) => a.localeCompare(b));

        const playersHtml = sortedTeams.map(team => {
            const flagImg = team && team !== 'Unknown'
                ? `<img src="https://flagcdn.com/16x12/${getCountryCode(team)}.png" onerror="this.style.display='none'" class="inline rounded-[1px] opacity-90">`
                : '';
            
            const namesList = playersByTeam[team].join(', ');
            
            return `
            <div class="inline-flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-full text-xs hover:border-cyan-500/50 transition-colors shadow-sm">
                ${flagImg}
                <span class="font-bold text-primary">${namesList}</span>
            </div>`;
        }).join('');

        return `
            <tr class="border-b border-border/30 hover:bg-white/5 transition-colors">
                <td class="py-3 pr-4 text-center align-middle w-16">
                    <span class="text-cyan-400 font-black text-xl font-mono">${goals}</span>
                </td>
                <td class="py-3 align-middle">
                    <div class="flex flex-wrap gap-2">
                        ${playersHtml}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPlayerStats() {
    if (!currentData || !currentData.awards) return;
    
    function buildPodium(candidates, suffix="pts") {
        if (!candidates || candidates.length === 0) return '<div class="text-center text-muted italic text-sm py-4">Data belum tersedia</div>';
        return candidates.slice(0, 3).map((c, i) => {
            const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
            const medals = ['🥇', '🥈', '🥉'];
            const rawScore = c.score !== undefined ? c.score : (c.goals || 0);
            const displayScore = suffix === 'gol' ? c.goals : Math.round(rawScore);
            const flagImg = c.team && c.team !== 'Unknown' ? `<img src="https://flagcdn.com/16x12/${getCountryCode(c.team)}.png" class="inline rounded-[2px] mr-2 shadow-sm"/>` : '';
            return `<div class="flex items-center justify-between border-b border-border py-2.5">
                        <div class="flex items-center gap-3">
                            <span class="font-black text-lg ${colors[i] || 'text-muted'} w-7 text-center leading-none">${medals[i] || `${i+1}`}</span>
                            <div class="flex flex-col">
                                <span class="font-bold text-sm flex items-center">${flagImg} <span class="ml-0.5 text-primary tracking-tight">${c.name}</span></span>
                            </div>
                        </div>
                        <span class="font-mono text-[10px] text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-500/20 shadow-sm whitespace-nowrap">${displayScore} ${suffix}</span>
                    </div>`;
        }).join('');
    }

    const podiumPlayer = document.getElementById('podiumPlayer');
    if (podiumPlayer) podiumPlayer.innerHTML = buildPodium(currentData.awards.bestPlayer, "pts");
    
    const podiumTopScorer = document.getElementById('podiumTopScorer');
    if (podiumTopScorer) podiumTopScorer.innerHTML = buildPodium(currentData.awards.predictedBoot || currentData.awards.topScorerList, "gol");
    
    const podiumYoung = document.getElementById('podiumYoung');
    if (podiumYoung) podiumYoung.innerHTML = buildPodium(currentData.awards.bestYoung, "pts"); // Score used instead of pure age
    
    const podiumGK = document.getElementById('podiumGK');
    if (podiumGK) podiumGK.innerHTML = buildPodium(currentData.awards.bestGoalkeeper, "pts");
}

// ============ INIT ============
fetchPredictions();
setInterval(fetchPredictions, 30000);

// WIT Clock
setInterval(() => {
    const clock = document.getElementById('witClock');
    if (clock) {
        clock.innerText = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jayapura', hour12: false }) + ' WIT';
    }
}, 1000);
