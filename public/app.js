'use strict';

let currentData = null;
let probChart = null;
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

// Parse API scorer string format {"Name Minute'","Name2 Minute'"} and handle smart quotes
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

// Format scorer string for display: "F. Balogun 31', 45'+5'"
function formatScorerDisplay(s) {
    if (!s || s === 'null') return '';
    const re = /["“”]([^"“”]+)["“”]/g;
    const result = [];
    let match;
    while ((match = re.exec(s)) !== null) {
        const entry = match[1].trim();
        const name = entry.replace(/\s+\d+.*$/, '').replace(/\(OG\)/gi, '').replace(/\(p\)/gi, '').trim();
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
    if (!currentData) return;

    // Timestamp
    const ts = currentData.lastUpdate;
    try {
        document.getElementById('lastUpdate').innerText = ts
            ? new Date(ts).toLocaleString('id-ID', {dateStyle:'medium', timeStyle:'short'})
            : '-';
    } catch(e) {
        document.getElementById('lastUpdate').innerText = ts || '-';
    }

    buildGroupMap();
    renderOverview();
    renderRanking();
    renderGroups();
    renderFixturesList();
    renderFixturesCalendar();
    renderBracketTree();
    renderHistoryChart(currentData.history);
    renderPlayerStats();
}

function gotoMatch(id) {
    switchTab('Fixtures');
    toggleFixtureView('list');
    
    // Give DOM time to unhide tab and list view
    setTimeout(() => {
        const el = document.getElementById('match-' + id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add pulse animation
            el.classList.remove('highlight-pulse');
            void el.offsetWidth; // Trigger reflow
            el.classList.add('highlight-pulse');
        }
    }, 100);
}

// ============ OVERVIEW ============
function renderOverview() {
    // Final & Champion
    const finalEl = document.getElementById('final');
    if (finalEl) finalEl.innerText = (currentData.final || []).join(" vs ");
    
    const winnerEl = document.getElementById('winner');
    if (winnerEl) winnerEl.innerText = currentData.winner || '-';
    
    const winnerProbEl = document.getElementById('winnerProb');
    if (winnerProbEl) winnerProbEl.innerText = currentData.winnerProb != null ? currentData.winnerProb.toFixed(2) : '-';

    // Dark Horses
    const dhEl = document.getElementById('darkHorses');
    if (dhEl) {
        dhEl.innerHTML = (currentData.darkHorses || []).length > 0
            ? currentData.darkHorses.map(d =>
                `<div class="flex justify-between border-b border-border py-1.5">
                    <span class="font-bold text-sm">${d.name}</span>
                    <span class="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">${d.prob.toFixed(2)}% chance</span>
                </div>`).join('')
            : '<div class="text-muted italic text-sm">Tidak ada</div>';
    }

    // Flops
    const flopsEl = document.getElementById('flops');
    if (flopsEl) {
        flopsEl.innerHTML = (currentData.flops || []).length > 0
            ? currentData.flops.map(d =>
                `<div class="flex justify-between border-b border-border py-1.5">
                    <span class="font-bold text-sm">${d.name}</span>
                    <span class="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-500/20">${d.prob.toFixed(2)}% (high expectation)</span>
                </div>`).join('')
            : '<div class="text-muted italic text-sm">Semua raksasa sesuai ekspektasi</div>';
    }

    // Awards
    if (currentData.topScorer) {
        const topReal = document.getElementById('topScorerReal');
        if (topReal) topReal.innerText = currentData.topScorer.real || '-';
        
        const topExp = document.getElementById('topScorerExpected');
        if (topExp) topExp.innerText = currentData.topScorer.expected || '-';
    }
    
    const bp = document.getElementById('bestPlayer');
    if (bp) bp.innerText = currentData.bestPlayer || '-';
    
    const by = document.getElementById('bestYoung');
    if (by) by.innerText = currentData.bestYoung || '-';
    
    const bg = document.getElementById('bestGK');
    if (bg) bg.innerText = currentData.bestGoalkeeper || '-';

    // Live & Today Matches
    renderLiveMatches();
}

function renderLiveMatches() {
    const container = document.getElementById('liveMatches');
    const now = new Date();
    // Today = same local date, PLUS next upcoming match within 24h
    const todayStr = now.toISOString().split('T')[0];

    const todayMatches = (currentData.allFixtures || []).filter(m => {
        if (!m.utcDate) return false;
        const d = new Date(m.utcDate);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    // Find next upcoming match (within next 48h) if none today
    let upcomingMatches = [];
    if (todayMatches.length === 0) {
        const futureMatches = (currentData.allFixtures || [])
            .filter(m => m.utcDate && new Date(m.utcDate) > now)
            .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        if (futureMatches.length > 0) upcomingMatches = futureMatches.slice(0, 3);
    }

    const displayMatches = todayMatches.length > 0 ? todayMatches : upcomingMatches;
    const label = todayMatches.length === 0 && upcomingMatches.length > 0 ? '⏰ Pertandingan Terdekat' : '🔴 Pertandingan Hari Ini';
    const headerTitleEl = document.getElementById('liveMatchesTitle');
    const headerIconEl = document.getElementById('liveMatchesIcon');
    const headerContainer = document.getElementById('liveMatchesHeader');

    if (displayMatches.length === 0) {
        if (headerTitleEl) headerTitleEl.textContent = "Live & Today's Matches";
        if (headerIconEl) {
            headerIconEl.textContent = '⚪';
            headerIconEl.classList.remove('animate-pulse', 'text-red-500');
            headerIconEl.classList.add('text-gray-500');
        }
        if (headerContainer) {
            headerContainer.classList.add('text-gray-500');
        }
        container.innerHTML = '<div class="text-gray-500 italic text-sm">Tidak ada pertandingan hari ini.</div>';
        return;
    } else {
        if (headerTitleEl) headerTitleEl.textContent = label;
        if (headerIconEl) {
            headerIconEl.textContent = '🔴';
            headerIconEl.classList.add('animate-pulse', 'text-red-500');
            headerIconEl.classList.remove('text-gray-500');
        }
        if (headerContainer) {
            headerContainer.classList.remove('text-gray-500');
        }
    }

    container.innerHTML = displayMatches.map(m => {
        const isLiveBadge = m.isLive ? '<span class="animate-pulse bg-red-600 px-2 py-0.5 rounded text-xs font-bold text-white">LIVE</span>' : '';
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
            <div class="bg-gray-900/80 border border-gray-700/50 p-4 rounded-xl hover:border-cyan-600 transition-colors cursor-pointer" onclick="gotoMatch('${m.id}')">
                <div class="text-xs text-gray-400 mb-1 flex justify-between items-center">
                    <span class="text-cyan-700 font-semibold">${grpLabel}</span>
                    <span class="flex items-center gap-2">${isLiveBadge} ${time} WIT</span>
                </div>
                <div class="text-[10px] text-gray-500 mb-2 font-mono">📍 ${m.stadium || 'Stadion TBD'}</div>
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-base">${m.home}</span>
                    <span class="font-bold text-xl ${m.isFinished ? 'text-yellow-400' : 'text-gray-500'}">${m.score_h != null ? m.score_h : '-'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="font-bold text-base">${m.away}</span>
                    <span class="font-bold text-xl ${m.isFinished ? 'text-yellow-400' : 'text-gray-500'}">${m.score_a != null ? m.score_a : '-'}</span>
                </div>
                ${scorersHtml}
            </div>`;
    }).join('');
}

// ============ TREND TOGGLE ============
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

// ============ RANKING ============
function renderRanking() {
    const tbody = document.getElementById('rankingTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const maxProb = (currentData.globalRanking[0] || {winProb: 100}).winProb;

    const searchInput = document.getElementById('rankingSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    const trendBasis = document.getElementById('trendBasisSelect') ? document.getElementById('trendBasisSelect').value : 'last';
    const history = currentData.history || [];
    
    // Reference snapshot for trend
    let refSnapshot = null;
    if (history.length > 1) {
        if (trendBasis === 'first') {
            refSnapshot = history[0];
        } else {
            // "last" means the snapshot right before the current match finished
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

        // TIER SEPARATORS
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

    // Trigger animations
    document.querySelectorAll('.animate-prob').forEach(el => {
        const start = parseFloat(el.getAttribute('data-prev'));
        const end = parseFloat(el.getAttribute('data-target'));
        animateValue(el, start, end, 1200); // 1.2s animation
    });
}

// ============ GROUPS ============
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

// ============ FIXTURES ============
function renderFixtures() {
    renderFixturesList();
    renderFixturesCalendar();
}
function setMatchStatusFilter(status) {
    const filterEl = document.getElementById('matchStatusFilter');
    if(filterEl) filterEl.value = status;
    const btnRes = document.getElementById('btnMatchesResults');
    const btnUpc = document.getElementById('btnMatchesUpcoming');
    const activeClass = "px-4 py-1.5 rounded-sm bg-cyan-900/30 text-cyan-400 border border-border text-sm font-semibold transition-colors shadow-sm".split(" ");
    const inactiveClass = "px-4 py-1.5 rounded-sm text-muted text-sm font-semibold transition-colors hover:text-white".split(" ");
    
    if(status === 'results') {
        if(btnRes) { btnRes.classList.remove(...inactiveClass); btnRes.classList.add(...activeClass); }
        if(btnUpc) { btnUpc.classList.remove(...activeClass); btnUpc.classList.add(...inactiveClass); }
    } else {
        if(btnUpc) { btnUpc.classList.remove(...inactiveClass); btnUpc.classList.add(...activeClass); }
        if(btnRes) { btnRes.classList.remove(...activeClass); btnRes.classList.add(...inactiveClass); }
    }
    renderFixtures();
}

function renderFixturesList() {
    const container = document.getElementById('fixturesListContainer');
    if(!container) return;
    const searchInput = document.getElementById('fixtureSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = document.getElementById('matchStatusFilter') ? document.getElementById('matchStatusFilter').value : 'upcoming';

    const matches = (currentData.allFixtures || []).filter(m => {
        if(statusFilter === 'results' && !m.isFinished) return false;
        if(statusFilter === 'upcoming' && m.isFinished) return false;
        if (!query) return true;
        return m.home.toLowerCase().includes(query) || m.away.toLowerCase().includes(query) || m.group.toLowerCase().includes(query);
    });

    if (matches.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-8 font-mono">Tidak ada pertandingan yang cocok.</div>`;
        return;
    }

    container.innerHTML = matches.map(m => {
        let dateStr = '-';
        try { dateStr = new Date(m.utcDate).toLocaleString('id-ID', {weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) + ' WIT'; } catch(e) {}
        const grp = GROUP_NAME_MAP[m.home] ? `Grup ${GROUP_NAME_MAP[m.home].replace('Group ', '')}` : m.stage.replace(/_/g,' ');
        const hs = m.home_scorers && m.home_scorers !== 'null' ? formatScorerDisplay(m.home_scorers) : '';
        const as_ = m.away_scorers && m.away_scorers !== 'null' ? formatScorerDisplay(m.away_scorers) : '';
        const scorersHtml = (hs || as_) ? `
            <div class="w-full mt-3 pt-3 border-t border-border text-xs text-muted space-y-1">
                ${hs ? `<div>⚽ <span class="font-bold text-primary">${m.home}:</span> ${hs}</div>` : ''}
                ${as_ ? `<div>⚽ <span class="font-bold text-primary">${m.away}:</span> ${as_}</div>` : ''}
            </div>` : '';
        const badge = m.isFinished
            ? `<span class="bg-muted/20 text-muted px-2 py-0.5 rounded text-[10px] font-bold">FT</span>`
            : `<span class="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">SCHEDULED</span>`;

        const hCode = getCountryCode(m.home);
        const aCode = getCountryCode(m.away);
        const hFlag = hCode !== 'xx' ? `<img src="https://flagcdn.com/24x18/${hCode}.png" class="inline-block w-5 h-3.5 mr-2 rounded-[2px] shadow-sm" alt="${m.home}">` : '';
        const aFlag = aCode !== 'xx' ? `<img src="https://flagcdn.com/24x18/${aCode}.png" class="inline-block w-5 h-3.5 ml-2 rounded-[2px] shadow-sm" alt="${m.away}">` : '';

        return `
            <div id="match-${m.id}" class="bg-card p-5 rounded-xl flex flex-col border border-border shadow-sm hover:border-cyan-800 hover:shadow-[0_0_15px_rgba(34,211,238,0.05)] transition-all duration-300">
                <div class="flex justify-between items-center mb-2">
                    <div class="text-xs text-muted font-mono opacity-80">${dateStr}</div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] uppercase tracking-widest text-cyan-500 font-bold">${grp}</span>${badge}
                    </div>
                </div>
                <div class="text-[10px] text-muted mb-4 font-mono opacity-50">📍 ${m.stadium || 'Stadion TBD'}</div>
                <div class="flex justify-between items-center">
                    <div class="text-right font-bold text-sm md:text-lg flex-1 leading-tight ${m.score_h > m.score_a ? 'text-primary' : 'text-muted flex items-center justify-end'}">
                        ${m.score_h > m.score_a ? m.home+hFlag : m.home+hFlag} 
                    </div>
                    <div class="px-3 md:px-5 py-1.5 font-mono font-extrabold text-lg md:text-xl text-yellow-500 bg-background border border-border rounded-lg mx-2 md:mx-4 min-w-[60px] md:min-w-[70px] text-center shadow-inner shrink-0">
                        ${m.score_h != null ? m.score_h : '-'} : ${m.score_a != null ? m.score_a : '-'}
                    </div>
                    <div class="text-left font-bold text-sm md:text-lg flex-1 leading-tight ${m.score_a > m.score_h ? 'text-primary flex items-center' : 'text-muted flex items-center'}">
                        ${aFlag}${m.away}
                    </div>
                </div>
                ${scorersHtml}
            </div>`;
    }).join('');
}

function renderFixturesCalendar() {
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    grid.innerHTML = '';
    const searchInput = document.getElementById('fixtureSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    const statusFilter = document.getElementById('matchStatusFilter') ? document.getElementById('matchStatusFilter').value : 'upcoming';

    if (!currentData.allFixtures || currentData.allFixtures.length === 0) return;

    const start = new Date(2026, 5, 11);
    const end = new Date(2026, 6, 19);
    const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    days.forEach(d => { grid.innerHTML += `<div class="font-bold text-muted py-2 border-b border-border text-[10px] uppercase tracking-widest">${d}</div>`; });
    for (let i = 0; i < start.getDay(); i++) grid.innerHTML += `<div class="p-1 opacity-5"></div>`;

    let curr = new Date(start);
    while (curr <= end) {
        const matchesToday = currentData.allFixtures.filter(m => {
            if(statusFilter === 'results' && !m.isFinished) return false;
            if(statusFilter === 'upcoming' && m.isFinished) return false;
            if (!m.utcDate) return false;
            const d = new Date(m.utcDate);
            const isSameDay = d.getDate() === curr.getDate() && d.getMonth() === curr.getMonth() && d.getFullYear() === curr.getFullYear();
            if(!isSameDay) return false;
            if(query) return m.home.toLowerCase().includes(query) || m.away.toLowerCase().includes(query) || m.group.toLowerCase().includes(query);
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

// ============ BRACKET TREE ============
function renderBracketTree() {
    const container = document.getElementById('bracketContainer');
    if(!container) return;
    container.innerHTML = '';
    if (!currentData.bracket || currentData.bracket.length === 0) return;

    const stageLabels = {LAST_32:'Babak 32', LAST_16:'Babak 16', QUARTER_FINALS:'Perempat Final', SEMI_FINALS:'Semifinal', FINAL:'FINAL'};

    currentData.bracket.forEach(stageObj => {
        const stageMatches = stageObj.matches;
        if (!stageMatches || stageMatches.length === 0) return;

        let colHtml = `<div class="bracket-column">
            <div class="text-center text-cyan-400 text-[10px] uppercase tracking-widest mb-4 font-bold opacity-80">${stageLabels[stageObj.stage] || stageObj.stage}</div>`;

        stageMatches.forEach((m, rowIdx) => {
            const isTop = rowIdx % 2 === 0;
            const isOfficial = m.isFinished === true && m.status === 'FINISHED';
            const officialClass = isOfficial ? 'is-official' : '';
            const badge = isOfficial
                ? `<span class="absolute -top-2 -right-2 bg-lime text-background text-[8px] font-bold px-1.5 py-0.5 rounded-[1px] shadow">RESMI</span>`
                : `<span class="absolute -top-2 -right-2 bg-background border border-border text-[8px] text-muted px-1.5 py-0.5 rounded-[1px] shadow">PREDIKSI</span>`;

            const homeProb = m.home_prob != null ? m.home_prob.toFixed(1)+'%' : '?%';
            const awayProb = m.away_prob != null ? m.away_prob.toFixed(1)+'%' : '?%';
            const homeScore = m.score_h != null ? m.score_h : homeProb;
            const awayScore = m.score_a != null ? m.score_a : awayProb;
            const homeWin = m.isFinished ? m.score_h > m.score_a : m.home_prob >= m.away_prob;
            const awayWin = m.isFinished ? m.score_a > m.score_h : m.away_prob > m.home_prob;

            function getPathIcon(path) {
                const shadow = 'drop-shadow(0 2px 2px rgba(0,0,0,1))';
                if (path === 'WINNER') return `<span class="text-yellow-400 text-[10px] ml-1" style="filter: ${shadow};" title="Juara Grup">👑</span>`;
                if (path === 'RUNNER_UP') return `<span class="text-muted text-[10px] ml-1" style="filter: ${shadow};" title="Runner-up">🥈</span>`;
                if (path === 'BEST_THIRD') return `<span class="text-orange-400 text-[10px] ml-1" style="filter: ${shadow};" title="Peringkat 3 Terbaik">🥉</span>`;
                return '';
            }

            const hPath = m.home_path ? getPathIcon(m.home_path) : '';
            const aPath = m.away_path ? getPathIcon(m.away_path) : '';
            
            const hFlag = m.home && m.home !== 'TBD' ? `<img src="https://flagcdn.com/16x12/${getCountryCode(m.home)}.png" class="inline rounded-[1px] mr-1.5 opacity-90"/>` : '';
            const aFlag = m.away && m.away !== 'TBD' ? `<img src="https://flagcdn.com/16x12/${getCountryCode(m.away)}.png" class="inline rounded-[1px] mr-1.5 opacity-90"/>` : '';

            let bgStyle = '';
            if (!isOfficial && (m.home !== 'TBD' || m.away !== 'TBD')) {
                const flagCode = getCountryCode(homeWin ? m.home : m.away);
                if (flagCode !== 'xx') {
                    // Using background color from FM theme with opacity overlay
                    bgStyle = `style="background-image: linear-gradient(rgba(28,28,40,0.92), rgba(28,28,40,0.92)), url('https://flagcdn.com/120x90/${flagCode}.png'); background-size: cover; background-position: center;"`;
                }
            }

            colHtml += `
                <div class="match-box ${isTop ? 'top-bracket' : 'bottom-bracket'} ${officialClass} relative border border-border" ${bgStyle}>
                    ${badge}
                    <div class="text-[10px] text-muted mb-2 flex justify-between relative z-10 font-mono">
                        <span>M${m.id}</span>
                        ${m.isFinished ? `<span class="text-yellow-500 font-bold">FT</span>` : ''}
                    </div>
                    <div class="flex justify-between items-center mb-1.5 relative z-10">
                        <span class="font-bold text-sm ${homeWin ? 'text-primary' : 'text-muted'} truncate max-w-[140px] flex items-center">${hFlag}${m.home || 'TBD'} ${hPath}</span>
                        <span class="text-xs font-mono ml-2 flex-shrink-0 ${m.isFinished ? 'text-yellow-400 bg-background px-1.5 rounded-sm border border-border' : 'text-muted'}">${homeScore}</span>
                    </div>
                    <div class="flex justify-between items-center relative z-10">
                        <span class="font-bold text-sm ${awayWin ? 'text-primary' : 'text-muted'} truncate max-w-[140px] flex items-center">${aFlag}${m.away || 'TBD'} ${aPath}</span>
                        <span class="text-xs font-mono ml-2 flex-shrink-0 ${m.isFinished ? 'text-yellow-400 bg-background px-1.5 rounded-sm border border-border' : 'text-muted'}">${awayScore}</span>
                    </div>
                </div>`;
        });

        colHtml += `</div>`;
        container.innerHTML += colHtml;
    });
}

// ============ HISTORY CHART ============
let chartMode = 'top5';

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
function renderPlayerStats() {
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

    const sorted = Object.entries(scorerMap)
        .sort((a, b) => b[1].goals - a[1].goals)
        .slice(0, 5);

    if (sorted.length === 0) {
        container.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-muted italic">Belum ada data gol.</td></tr>`;
        return;
    }

    container.innerHTML = sorted.map(([name, data], idx) => {
        const cCode = getCountryCode(data.team);
        const flagSrc = cCode !== 'xx' ? `<img src="https://flagcdn.com/20x15/${cCode}.png" class="inline-block w-4 h-3 mr-2 opacity-90 rounded-[1px] shadow-sm" alt="${data.team}">` : '';
        return `
        <tr class="hover:bg-muted/10 transition-colors border-b border-border">
            <td class="py-2 pl-2 text-muted text-xs font-mono">${idx+1}</td>
            <td class="py-2 font-bold text-primary text-xs truncate max-w-[120px]">${flagSrc}${name}</td>
            <td class="py-2 pr-2 text-right text-cyan-400 font-mono font-bold text-xs">${data.goals}</td>
        </tr>`;
    }).join('');
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

// ============ INIT ============
fetchPredictions();
setInterval(fetchPredictions, 30000);
