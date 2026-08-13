let currentLang = 'en'; 
let allData = {};
let typeWriterTimeout;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initSpotlight();

    try {
        const response = await fetch('./data/cv-data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        allData = await response.json();
        
        detectAndApplyLanguage();
        initCommandPalette();
        
    } catch (error) {
        console.error("Fatal Error:", error);
        showErrorUI(error.message);
    } finally {
        const loader = document.getElementById('loading-screen');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }
});

// --- Theme Management ---
function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if(!btn) return;
    
    btn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
    });
}

// --- Language Logic ---
function detectAndApplyLanguage() {
    const savedLang = localStorage.getItem('user_lang');
    
    if (savedLang) {
        currentLang = savedLang;
    } else {
        const userLang = navigator.language || navigator.userLanguage;
        if (userLang && userLang.toLowerCase().startsWith('pt')) {
            currentLang = 'pt';
        }
    }

    updateLanguageUI();
    renderPage();
}

window.setLanguage = function(lang) {
    if (currentLang === lang) return;
    currentLang = lang;
    localStorage.setItem('user_lang', lang); 
    updateLanguageUI();
    renderPage();
}

function updateLanguageUI() {
    const btnPt = document.getElementById('btn-pt');
    const btnEn = document.getElementById('btn-en');
    
    if(!btnPt || !btnEn) return;

    if (currentLang === 'en') {
        btnEn.className = "font-bold text-ibm-blue cursor-default";
        btnPt.className = "text-slate-400 dark:text-slate-600 hover:text-ibm-blue transition-colors";
        document.documentElement.lang = 'en';
    } else {
        btnPt.className = "font-bold text-ibm-blue cursor-default";
        btnEn.className = "text-slate-400 dark:text-slate-600 hover:text-ibm-blue transition-colors";
        document.documentElement.lang = 'pt-BR';
    }
    
    if(allData[currentLang]) {
        const linkedin = document.getElementById('linkedin-btn-header');
        const email = document.getElementById('email-btn');
        const github = document.getElementById('github-btn-header');
        if(linkedin) linkedin.href = allData[currentLang].profile.linkedin;
        if(email) email.href = `mailto:${allData[currentLang].profile.email}`;
        if(github && allData[currentLang].profile.github) github.href = allData[currentLang].profile.github;
    }
}

// --- Typewriter Effect ---
function startTypeWriter(text, elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;

    if (el.textContent === text && !el.dataset.typing) return;

    el.textContent = "";
    el.dataset.typing = "true";
    clearTimeout(typeWriterTimeout);
    
    let i = 0;
    function type() {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
            typeWriterTimeout = setTimeout(type, 30);
        } else {
            el.removeAttribute('data-typing');
        }
    }
    type();
}

// --- Renders ---
function renderPage() {
    if(!allData[currentLang]) return;

    const data = allData[currentLang];
    const common = allData.common;
    const ui = data.ui;

    // Header & Texts
    setText('profile-name', data.profile.name);
    startTypeWriter(data.profile.role, 'profile-role');
    setText('profile-summary', data.profile.summary);
    setText('contact-text', ui.contactBtn);
    setText('nav-availability', data.profile.availability);
    
    // --- LÓGICA DE PDF (GERADOR) ---
    const btnDownload = document.getElementById('btn-download-cv');
    const textDownload = document.getElementById('nav-download-text');
    
    if (btnDownload) {
        if (textDownload) textDownload.textContent = ui.downloadBtn || "Generate PDF";
        
        // Remove links antigos
        btnDownload.removeAttribute('href');
        btnDownload.removeAttribute('download');
        
        // Novo comportamento: Gerar PDF ao clicar
        btnDownload.onclick = (e) => {
            e.preventDefault();
            generatePDF();
        };
    }
    
    setText('scroll-text', ui.scrollText);

    // Profile Photo
    const img = document.getElementById('profile-img');
    if(img && data.profile.photoUrl && !img.src.includes(data.profile.photoUrl)) {
        img.src = data.profile.photoUrl;
    }

    // Titles
    setText('title-core', ui.coreStackTitle);
    setText('title-experience', ui.experienceTitle);
    setText('title-skills', ui.skillsTitle);
    setText('title-education', ui.educationTitle);
    setText('title-languages', ui.languagesTitle);
    setText('title-projects', ui.projectsTitle);
    setText('title-demos', ui.demosTitle);
    setText('demos-intro', ui.demosIntro);

    // Sections
    renderStats(common.stats);
    renderCoreStack(common.skills);
    renderExperience(data.experience);
    renderProjects(data.projects, ui);
    renderApiDemos(common.demos, data.demos, ui);
    renderSkillsGrid(common.skills);
    renderEducation(data.education);
    renderLanguages(common.languages);
    renderContactForm(ui, data.profile);
}

function renderStats(stats) {
    const container = document.getElementById('stats-row');
    if(!container || !stats) return;

    container.innerHTML = stats.map(s => `
        <div class="stat-card">
            <b>${s.value}</b>
            <span>${currentLang === 'pt' ? s.label_pt : s.label_en}</span>
        </div>
    `).join('');
}

function renderCoreStack(skills) {
    const container = document.getElementById('core-stack');
    if(!container) return;
    
    const core = [...skills[0].items, ...skills[1].items].slice(0, 8);
    container.innerHTML = core.map(skill => 
        `<div class="tech-tag flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            ${skill}
        </div>`
    ).join('');
}

function renderJobDescription(description) {
    if (Array.isArray(description)) {
        return `<ul class="job-bullets text-slate-700 dark:text-slate-300">
            ${description.map(d => `<li>${d}</li>`).join('')}
        </ul>`;
    }
    return `<p class="text-slate-700 dark:text-slate-300 text-base leading-relaxed">${description}</p>`;
}

function renderExperience(experience) {
    const container = document.getElementById('experience-list');
    if(!container) return;

    container.innerHTML = experience.map((job, i) => `
        <div class="relative group">
            <div class="job-node${i % 2 ? ' alt' : ''}"></div>

            <div class="flex flex-col md:flex-row md:justify-between md:items-baseline mb-2">
                <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">${job.company}</h4>
                <span class="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">${job.period}</span>
            </div>

            <div class="text-sm font-medium ${i % 2 ? 'text-ibm-royal' : 'text-ibm-blue'} font-mono mb-3">${job.role}</div>

            ${renderJobDescription(job.description)}
        </div>
    `).join('');
}

function renderProjects(projects, ui) {
    const container = document.getElementById('projects-grid');
    if(!container) return;

    if(!projects || projects.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm font-mono">No projects loaded.</p>';
        return;
    }

    container.innerHTML = projects.map(proj => `
        <div class="project-card cursor-default">
            <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 font-sans">${proj.title}</h4>
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">${proj.description}</p>
            <div class="flex flex-wrap gap-2">
                ${proj.tech.map((t, i) => `<span class="text-xs font-mono ${i % 2 ? 'text-ibm-royal bg-ibm-royal/10' : 'text-ibm-blue bg-ibm-blue/10'} px-2 py-1 rounded-md">${t}</span>`).join('')}
            </div>
            ${(proj.repoUrl || proj.demoUrl) ? `
            <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#1A1210]/10 dark:border-[#EDE3D8]/10">
                ${proj.repoUrl ? `<a href="${proj.repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-github"></i>${ui.viewCodeBtn || 'View code'}</a>` : ''}
                ${proj.demoUrl ? `<a href="${proj.demoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-box-arrow-up-right"></i>${ui.tryLiveBtn || 'Try it live'}</a>` : ''}
            </div>` : ''}
        </div>
    `).join('');
}

function renderSkillsGrid(skills) {
    const container = document.getElementById('skills-grid');
    if(!container) return;

    container.innerHTML = skills.map(cat => `
        <div>
            <h4 class="font-sans font-bold text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors">
                ${currentLang === 'pt' ? cat.category_pt : cat.category}
            </h4>
            <ul class="space-y-2 font-mono text-sm text-slate-700 dark:text-slate-300">
                ${cat.items.map(item => `
                    <li class="flex items-center gap-3">
                        <span class="text-slate-400 dark:text-slate-600">::</span> ${item}
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

function renderEducation(education) {
    const container = document.getElementById('education-list');
    if(!container) return;

    container.innerHTML = education.map(edu => `
        <div class="mb-4">
            <div class="font-bold text-slate-900 dark:text-slate-100">${edu.institution}</div>
            <div class="text-slate-700 dark:text-slate-300">${edu.degree}</div>
            <div class="text-slate-500 dark:text-slate-500 text-xs mt-1">${edu.period}</div>
        </div>
    `).join('');
}

function renderLanguages(languages) {
    const container = document.getElementById('languages-list');
    if(!container) return;

    container.innerHTML = languages.map(lang => `
        <div class="flex justify-between text-sm font-mono">
            <span class="text-slate-800 dark:text-slate-200">${lang.name}</span>
            <span class="text-slate-500 dark:text-slate-500">[${lang.level}]</span>
        </div>
    `).join('');
}

const CONTACT_FORM_ENDPOINT = 'https://formspree.io/f/mppadwyj';

function renderContactForm(ui, profile) {
    const email = profile.email;
    const direct = document.getElementById('contact-direct');
    if(direct) {
        direct.innerHTML = `
            <a href="mailto:${email}" class="hover:text-ibm-blue transition-colors">${email}</a>
            ${profile.phone ? `<a href="tel:${profile.phone.replace(/\s/g, '')}" class="hover:text-ibm-blue transition-colors">${profile.phone}</a>` : ''}
            ${profile.location ? `<span>${profile.location}</span>` : ''}
        `;
    }

    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const messageInput = document.getElementById('contact-message');
    const submitBtn = document.getElementById('contact-submit');
    const statusEl = document.getElementById('contact-status');
    const form = document.getElementById('contact-form-el');
    if(!form) return;

    setText('contact-title', ui.contactFormTitle);
    if(nameInput) nameInput.placeholder = ui.contactNamePlaceholder;
    if(emailInput) emailInput.placeholder = ui.contactEmailPlaceholder;
    if(messageInput) messageInput.placeholder = ui.contactMessagePlaceholder;
    if(submitBtn) submitBtn.textContent = ui.contactSendBtn;

    form.onsubmit = async (e) => {
        e.preventDefault();
        if(!statusEl) return;

        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = ui.contactSending;
        statusEl.className = 'form-status';
        statusEl.textContent = '';

        try {
            const res = await fetch(CONTACT_FORM_ENDPOINT, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new FormData(form)
            });
            if(!res.ok) throw new Error('request failed');

            statusEl.className = 'form-status success';
            statusEl.textContent = ui.contactSuccess;
            form.reset();
        } catch (err) {
            statusEl.className = 'form-status error';
            statusEl.innerHTML = `${ui.contactError} <a href="mailto:${email}">${email}</a>`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    };
}

// --- Live API demos (Mule weather / ACE currency) ---
const DEMO_SVGS = {
    mule: `<svg viewBox="0 0 460 90" class="flow-diagram w-full h-auto mb-4" aria-hidden="true">
        <text x="35" y="20" text-anchor="middle">HTTP In</text>
        <rect class="flow-box" x="4" y="28" width="62" height="34" rx="0"/>
        <text x="35" y="49" text-anchor="middle" class="flow-label">Listener</text>

        <path class="flow-arrow" d="M66 45 H98"/>
        <polygon class="flow-arrowhead" points="94,40 100,45 94,50"/>

        <text x="135" y="20" text-anchor="middle">1h TTL</text>
        <rect class="flow-box" x="100" y="28" width="70" height="34"/>
        <text x="135" y="49" text-anchor="middle" class="flow-label">Geocode</text>

        <path class="flow-arrow" d="M170 45 H202"/>
        <polygon class="flow-arrowhead" points="198,40 204,45 198,50"/>

        <rect class="flow-box accent" x="204" y="8" width="120" height="74"/>
        <text x="264" y="26" text-anchor="middle" class="flow-label small">Scatter-Gather</text>
        <rect class="flow-box inner" x="212" y="34" width="104" height="18"/>
        <text x="264" y="47" text-anchor="middle" class="flow-label small">Forecast</text>
        <rect class="flow-box inner" x="212" y="56" width="104" height="18"/>
        <text x="264" y="69" text-anchor="middle" class="flow-label small">Air Quality</text>

        <path class="flow-arrow" d="M324 45 H356"/>
        <polygon class="flow-arrowhead" points="352,40 358,45 352,50"/>

        <text x="418" y="20" text-anchor="middle">JSON</text>
        <rect class="flow-box" x="358" y="28" width="98" height="34"/>
        <text x="407" y="49" text-anchor="middle" class="flow-label">Response</text>
    </svg>`,
    ace: `<svg viewBox="0 0 460 90" class="flow-diagram w-full h-auto mb-4" aria-hidden="true">
        <text x="35" y="20" text-anchor="middle">HTTP In</text>
        <rect class="flow-box" x="4" y="28" width="62" height="34"/>
        <text x="35" y="49" text-anchor="middle" class="flow-label">Listener</text>

        <path class="flow-arrow" d="M66 45 H98"/>
        <polygon class="flow-arrowhead" points="94,40 100,45 94,50"/>

        <text x="135" y="20" text-anchor="middle">10m TTL</text>
        <rect class="flow-box" x="100" y="28" width="70" height="34"/>
        <text x="135" y="49" text-anchor="middle" class="flow-label">Fetch EUR</text>

        <path class="flow-arrow" d="M170 45 H202"/>
        <polygon class="flow-arrowhead" points="198,40 204,45 198,50"/>

        <rect class="flow-box accent" x="204" y="28" width="120" height="34"/>
        <text x="264" y="49" text-anchor="middle" class="flow-label">Triangulate</text>
        <text x="264" y="17" text-anchor="middle" class="flow-label small">rate = eur[to] / eur[from]</text>

        <path class="flow-arrow" d="M324 45 H356"/>
        <polygon class="flow-arrowhead" points="352,40 358,45 352,50"/>

        <text x="418" y="20" text-anchor="middle">JSON</text>
        <rect class="flow-box" x="358" y="28" width="98" height="34"/>
        <text x="407" y="49" text-anchor="middle" class="flow-label">Reply</text>
    </svg>`
};

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ISO codes actually present in the live Frankfurter-backed rate table (verified against
// GET /api/currency/rates?base=EUR). Keeps the <select> options guaranteed valid server-side.
const ACE_CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK',
    'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN',
    'RON', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR'];

function renderCurrencyOptions(selected) {
    return ACE_CURRENCIES.map(c => `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`).join('');
}

// Keyed by the English description text the Mule flow always emits (a fixed WMO-code enum) --
// no backend change needed to get an icon client-side.
const WEATHER_EMOJI = {
    'Clear sky': '☀️', 'Mainly clear': '🌤️', 'Partly cloudy': '⛅', 'Overcast': '☁️',
    'Fog': '🌫️', 'Depositing rime fog': '🌫️',
    'Light drizzle': '🌦️', 'Moderate drizzle': '🌦️', 'Dense drizzle': '🌧️',
    'Slight rain': '🌧️', 'Moderate rain': '🌧️', 'Heavy rain': '🌧️',
    'Slight snow': '🌨️', 'Moderate snow': '🌨️', 'Heavy snow': '❄️',
    'Slight rain showers': '🌦️', 'Moderate rain showers': '🌧️', 'Violent rain showers': '⛈️',
    'Thunderstorm': '⛈️', 'Thunderstorm with slight hail': '⛈️', 'Thunderstorm with heavy hail': '⛈️'
};
function weatherEmoji(desc) {
    return (desc && WEATHER_EMOJI[desc.en]) || '🌡️';
}

function aqiLabel(aqi, ui) {
    if (aqi == null) return null;
    if (aqi <= 20) return { text: ui.demoAqiGood, cls: 'is-good' };
    if (aqi <= 40) return { text: ui.demoAqiFair, cls: 'is-fair' };
    if (aqi <= 60) return { text: ui.demoAqiModerate, cls: 'is-moderate' };
    if (aqi <= 80) return { text: ui.demoAqiPoor, cls: 'is-poor' };
    return { text: ui.demoAqiVeryPoor, cls: 'is-very-poor' };
}

// A handful of well-known capitals across continents, verified against the
// live weather API to resolve to the expected country. `query` is what's
// actually sent to /api/weather; pt/en are just the button's display label.
const CAPITAL_SUGGESTIONS = [
    { query: 'Brasília', pt: 'Brasília', en: 'Brasília' },
    { query: 'Washington', pt: 'Washington', en: 'Washington' },
    { query: 'London', pt: 'Londres', en: 'London' },
    { query: 'Paris', pt: 'Paris', en: 'Paris' },
    { query: 'Tokyo', pt: 'Tóquio', en: 'Tokyo' },
    { query: 'Cairo', pt: 'Cairo', en: 'Cairo' },
    { query: 'Moscow', pt: 'Moscou', en: 'Moscow' },
    { query: 'Canberra', pt: 'Camberra', en: 'Canberra' },
    { query: 'New Delhi', pt: 'Nova Delhi', en: 'New Delhi' },
    { query: 'Buenos Aires', pt: 'Buenos Aires', en: 'Buenos Aires' }
];

function renderQuickPicks(idPrefix, ui) {
    return `
        <div class="demo-quick-picks">
            <span class="demo-quick-picks-label">${ui.demoQuickPicks}</span>
            ${CAPITAL_SUGGESTIONS.map((c, i) => `<button type="button" class="demo-chip demo-quick-pick" data-idx="${i}" data-prefix="${idPrefix}">${escapeHtml(currentLang === 'pt' ? c.pt : c.en)}</button>`).join('')}
        </div>`;
}

function renderStepsList(steps, ui) {
    if (!steps || !steps.length) return '';
    return `
        <details class="demo-steps-block mb-4">
            <summary class="demo-steps-summary">${ui.demoHowItWorks}</summary>
            <ul class="demo-steps-list">
                ${steps.map(s => `<li>${s}</li>`).join('')}
            </ul>
        </details>`;
}

function renderWeatherSummary(data, ui) {
    if (data.error) return `<div class="demo-pretty-error">${escapeHtml(data.message || data.error)}</div>`;
    const emoji = weatherEmoji(data.description);
    const desc = (currentLang === 'pt' ? data.description.pt : data.description.en) || '';
    const aq = data.airQuality ? aqiLabel(data.airQuality.europeanAqi, ui) : null;
    return `
        <div class="demo-weather-summary">
            <div class="demo-weather-emoji">${emoji}</div>
            <div class="demo-weather-main">
                <div class="demo-weather-temp">${data.temperatureCelsius}&deg;C</div>
                <div class="demo-weather-place">${escapeHtml(data.city)}${data.country ? ', ' + escapeHtml(data.country) : ''} &mdash; ${escapeHtml(desc)}</div>
            </div>
            <div class="demo-weather-stats">
                <span>&#128168; ${data.windSpeedKmh} km/h</span>
                ${aq ? `<span class="demo-aqi-badge ${aq.cls}">AQI ${data.airQuality.europeanAqi} &middot; ${aq.text}</span>` : ''}
            </div>
        </div>`;
}

function renderCompareResults(data, ui) {
    if (data.error) return `<div class="demo-pretty-error">${escapeHtml(data.message || data.error)}</div>`;
    const results = data.results || [];
    return `<div class="demo-compare-grid">${results.map(r => {
        if (!r.ok) {
            return `<div class="demo-compare-card is-error">
                <div class="demo-compare-city">${escapeHtml(r.city)}</div>
                <div class="demo-compare-err">${escapeHtml(r.error || '?')}</div>
            </div>`;
        }
        const emoji = weatherEmoji(r.data.description);
        const desc = (currentLang === 'pt' ? r.data.description.pt : r.data.description.en) || '';
        return `<div class="demo-compare-card">
            <div class="demo-compare-city">${escapeHtml(r.data.city)}</div>
            <div class="demo-compare-emoji">${emoji}</div>
            <div class="demo-compare-temp">${r.data.temperatureCelsius}&deg;C</div>
            <div class="demo-compare-desc">${escapeHtml(desc)}</div>
        </div>`;
    }).join('')}</div>`;
}

function renderConvertSummary(data, ui) {
    if (data.error) return `<div class="demo-pretty-error">${escapeHtml(data.message || data.error)}</div>`;
    return `
        <div class="demo-convert-summary">
            <span class="demo-convert-amount">${data.amount} ${data.from}</span>
            <span class="demo-convert-arrow">&rarr;</span>
            <span class="demo-convert-result">${data.convertedAmount} ${data.to}</span>
            <span class="demo-convert-rate">1 ${data.from} = ${data.rate} ${data.to}${data.cached ? ' &#9889;' : ''}</span>
        </div>`;
}

function renderManyResults(data, ui) {
    if (data.error) return `<div class="demo-pretty-error">${escapeHtml(data.message || data.error)}</div>`;
    const results = data.results || [];
    return `<div class="demo-compare-grid">${results.map(r => {
        if (!r.ok) {
            return `<div class="demo-compare-card is-error">
                <div class="demo-compare-city">${escapeHtml(r.pair)}</div>
                <div class="demo-compare-err">${escapeHtml(r.error || '?')}</div>
            </div>`;
        }
        return `<div class="demo-compare-card">
            <div class="demo-compare-city">${escapeHtml(r.pair)}</div>
            <div class="demo-compare-temp">${r.convertedAmount} ${r.to}</div>
            <div class="demo-compare-desc">1 ${r.from} = ${r.rate} ${r.to}</div>
        </div>`;
    }).join('')}</div>`;
}

function renderRatesTable(data, ui) {
    if (data.error) return `<div class="demo-pretty-error">${escapeHtml(data.message || data.error)}</div>`;
    const rows = Object.entries(data.rates || {}).sort((a, b) => a[0].localeCompare(b[0]));
    return `
        <div class="demo-rates-table-wrap">
            <table class="demo-rates-table">
                <thead><tr><th>${ui.demoRatesTableCcy}</th><th>${ui.demoRatesTableRate}</th></tr></thead>
                <tbody>${rows.map(([code, rate]) => `<tr><td>${code}</td><td>${rate}</td></tr>`).join('')}</tbody>
            </table>
        </div>`;
}

function renderApiDemos(demosCommon, demosText, ui) {
    const container = document.getElementById('demos-grid');
    if (!container || !demosCommon || !demosText) return;

    container.innerHTML = demosCommon.map(dc => {
        const dt = demosText.find(d => d.id === dc.id);
        if (!dt) return '';

        const linksRow = `
            <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#1A1210]/10 dark:border-[#EDE3D8]/10">
                <a href="${dc.repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-github"></i>${ui.demoCodeBtn}</a>
                <a href="${dc.docsUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-file-earmark-text"></i>${ui.demoSwaggerBtn}</a>
            </div>`;

        if (dc.id === 'mule') {
            return `
                <div class="project-card rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">${dt.title} <span class="text-xs font-mono text-ibm-blue align-middle">${dt.badge}</span> <span id="mule-demo-status" class="demo-status is-checking" title="${ui.demoStatusChecking}">&#9679;</span></h4>
                    </div>
                    <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">${dt.description}</p>
                    ${DEMO_SVGS.mule}
                    ${renderStepsList(dt.steps, ui)}

                    <div id="mule-tabs" class="demo-tabs">
                        <button type="button" class="demo-tab is-active" data-tab="single">${dt.tabSingleLabel}</button>
                        <button type="button" class="demo-tab" data-tab="compare">${dt.tabCompareLabel}</button>
                    </div>
                    <div id="mule-panels">
                        <div class="demo-tab-panel" data-panel="single">
                            <form id="mule-demo-form" class="mb-1">
                                <div class="demo-geo-search">
                                    <input type="text" id="mule-demo-city" class="form-input" placeholder="${dt.geoSearchPlaceholder}" autocomplete="off" required role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="mule-geo-suggestions" />
                                    <div id="mule-geo-suggestions" class="demo-geo-suggestions is-hidden" role="listbox"></div>
                                </div>
                                ${renderQuickPicks('mule-single', ui)}
                                <button type="submit" class="w-full mt-2 px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] bg-[#1A1210] dark:bg-[#EDE3D8] text-white dark:text-[#1A1210] text-sm font-mono hover:bg-ibm-blue hover:border-ibm-blue dark:hover:bg-ibm-blue dark:hover:border-ibm-blue dark:hover:text-white transition-all whitespace-nowrap">${dt.submitBtn}</button>
                            </form>
                            <p class="demo-geo-attribution">${ui.demoGeoAttribution} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></p>
                        </div>
                        <div class="demo-tab-panel is-hidden" data-panel="compare">
                            <div class="demo-geo-search mb-2">
                                <div class="grid grid-cols-[1fr_auto] gap-2">
                                    <input type="text" id="mule-compare-input" class="form-input" placeholder="${dt.geoSearchPlaceholder}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="mule-compare-suggestions" />
                                    <button type="button" id="mule-compare-add" class="px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] text-[#1A1210] dark:text-[#EDE3D8] text-sm font-mono hover:border-ibm-blue hover:text-ibm-blue transition-all whitespace-nowrap">${dt.addCityBtn}</button>
                                </div>
                                <div id="mule-compare-suggestions" class="demo-geo-suggestions is-hidden" role="listbox"></div>
                            </div>
                            ${renderQuickPicks('mule-compare', ui)}
                            <div id="mule-compare-chips" class="demo-chip-list"></div>
                            <p class="demo-chip-hint">${dt.compareHint}</p>
                            <button type="button" id="mule-compare-submit" class="w-full mb-1 px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] bg-[#1A1210] dark:bg-[#EDE3D8] text-white dark:text-[#1A1210] text-sm font-mono hover:bg-ibm-blue hover:border-ibm-blue dark:hover:bg-ibm-blue dark:hover:border-ibm-blue dark:hover:text-white transition-all">${dt.compareBtn}</button>
                            <a href="${dc.extraUrl}" target="_blank" rel="noopener noreferrer" class="demo-inline-link">${dt.extraLabel} &#8599;</a>
                        </div>
                    </div>

                    <div id="mule-demo-pretty" class="mt-3"></div>
                    <details class="demo-raw-json-block mt-2">
                        <summary class="demo-steps-summary">${ui.demoRawJsonToggle}</summary>
                        <pre id="mule-demo-result" class="demo-result mt-2"><code>&larr; ${dt.resultPlaceholder.replace(/^←\s*/, '')}</code></pre>
                    </details>
                    ${linksRow}
                </div>`;
        }

        return `
            <div class="project-card rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">${dt.title} <span class="text-xs font-mono text-ibm-royal align-middle">${dt.badge}</span> <span id="ace-demo-status" class="demo-status is-checking" title="${ui.demoStatusChecking}">&#9679;</span></h4>
                </div>
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">${dt.description}</p>
                ${DEMO_SVGS.ace}
                ${renderStepsList(dt.steps, ui)}

                <div id="ace-tabs" class="demo-tabs">
                    <button type="button" class="demo-tab is-active" data-tab="convert">${dt.tabConvertLabel}</button>
                    <button type="button" class="demo-tab" data-tab="rates">${dt.tabRatesLabel}</button>
                    <button type="button" class="demo-tab" data-tab="many">${dt.tabManyLabel}</button>
                </div>
                <div id="ace-panels">
                    <div class="demo-tab-panel" data-panel="convert">
                        <form id="ace-demo-form" class="mb-3">
                            <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-2">
                                <select id="ace-demo-from" class="form-input">${renderCurrencyOptions('USD')}</select>
                                <button type="button" id="ace-demo-swap" class="demo-swap-btn" aria-label="${dt.swapAriaLabel}" title="${dt.swapAriaLabel}">&#8646;</button>
                                <select id="ace-demo-to" class="form-input">${renderCurrencyOptions('BRL')}</select>
                            </div>
                            <div class="grid grid-cols-[1fr_auto] gap-2">
                                <input type="number" id="ace-demo-amount" class="form-input" value="100" min="0" step="any" />
                                <button type="submit" class="px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] bg-[#1A1210] dark:bg-[#EDE3D8] text-white dark:text-[#1A1210] text-sm font-mono hover:bg-ibm-blue hover:border-ibm-blue dark:hover:bg-ibm-blue dark:hover:border-ibm-blue dark:hover:text-white transition-all whitespace-nowrap">${dt.submitBtn}</button>
                            </div>
                        </form>
                    </div>
                    <div class="demo-tab-panel is-hidden" data-panel="rates">
                        <div class="grid grid-cols-[1fr_auto] gap-2 mb-2">
                            <select id="ace-rates-base" class="form-input">${renderCurrencyOptions('USD')}</select>
                            <button type="button" id="ace-rates-submit" class="px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] bg-[#1A1210] dark:bg-[#EDE3D8] text-white dark:text-[#1A1210] text-sm font-mono hover:bg-ibm-blue hover:border-ibm-blue dark:hover:bg-ibm-blue dark:hover:border-ibm-blue dark:hover:text-white transition-all whitespace-nowrap">${dt.loadRatesBtn}</button>
                        </div>
                        <a href="${dc.extraUrl}" target="_blank" rel="noopener noreferrer" class="demo-inline-link">${dt.extraLabel} &#8599;</a>
                    </div>
                    <div class="demo-tab-panel is-hidden" data-panel="many">
                        <div class="grid grid-cols-[1fr_auto_1fr_auto] gap-2 mb-2">
                            <select id="ace-many-from" class="form-input">${renderCurrencyOptions('USD')}</select>
                            <span class="demo-convert-arrow">&rarr;</span>
                            <select id="ace-many-to" class="form-input">${renderCurrencyOptions('BRL')}</select>
                            <button type="button" id="ace-many-add" class="px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] text-[#1A1210] dark:text-[#EDE3D8] text-sm font-mono hover:border-ibm-blue hover:text-ibm-blue transition-all whitespace-nowrap">${dt.addPairBtn}</button>
                        </div>
                        <div id="ace-many-chips" class="demo-chip-list"></div>
                        <p class="demo-chip-hint">${dt.manyHint}</p>
                        <div class="grid grid-cols-[1fr_auto] gap-2 mb-1">
                            <input type="number" id="ace-many-amount" class="form-input" value="100" min="0" step="any" />
                            <button type="button" id="ace-many-submit" class="px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] bg-[#1A1210] dark:bg-[#EDE3D8] text-white dark:text-[#1A1210] text-sm font-mono hover:bg-ibm-blue hover:border-ibm-blue dark:hover:bg-ibm-blue dark:hover:border-ibm-blue dark:hover:text-white transition-all whitespace-nowrap">${dt.manyBtn}</button>
                        </div>
                        <a href="${dc.extraUrl2}" target="_blank" rel="noopener noreferrer" class="demo-inline-link">${dt.extraLabel2} &#8599;</a>
                    </div>
                </div>

                <div id="ace-demo-pretty" class="mt-3"></div>
                <details class="demo-raw-json-block mt-2">
                    <summary class="demo-steps-summary">${ui.demoRawJsonToggle}</summary>
                    <pre id="ace-demo-result" class="demo-result mt-2"><code>&larr; ${dt.resultPlaceholder.replace(/^←\s*/, '')}</code></pre>
                </details>
                ${linksRow}
            </div>`;
    }).join('');

    initApiDemos(ui, demosText);
    demosCommon.forEach(dc => checkDemoStatus(dc.id, dc.apiBase, ui));
}

async function checkDemoStatus(id, apiBase, ui) {
    const el = document.getElementById(`${id}-demo-status`);
    if (!el) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
        const res = await fetch(apiBase, { signal: controller.signal });
        // A 4xx here just means our own validation rejected the empty ping request --
        // the service is still up. Only 5xx / a network failure means it's actually down.
        if (res.status >= 500) throw new Error('upstream error');
        el.className = 'demo-status is-online';
        el.title = ui.demoStatusOnline;
    } catch (err) {
        el.className = 'demo-status is-offline';
        el.title = ui.demoStatusOffline;
    } finally {
        clearTimeout(timeoutId);
    }
}

function initDemoTabs(prefix, resultElId, prettyElId, placeholderText) {
    const tabs = document.querySelectorAll(`#${prefix}-tabs .demo-tab`);
    const resultEl = document.getElementById(resultElId);
    const prettyEl = document.getElementById(prettyElId);
    tabs.forEach(tab => {
        tab.onclick = () => {
            if (tab.classList.contains('is-active')) return;
            tabs.forEach(t => t.classList.remove('is-active'));
            tab.classList.add('is-active');
            document.querySelectorAll(`#${prefix}-panels .demo-tab-panel`).forEach(p => {
                p.classList.toggle('is-hidden', p.dataset.panel !== tab.dataset.tab);
            });
            if (resultEl) { resultEl.className = 'demo-result'; resultEl.innerHTML = `<code>&larr; ${placeholderText}</code>`; }
            if (prettyEl) prettyEl.innerHTML = '';
        };
    });
}

function renderChips(containerId, cities, ui, onRemove) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = cities.map((c, i) => `
        <span class="demo-chip">${escapeHtml(c)}<button type="button" class="demo-chip-remove" data-idx="${i}" aria-label="${ui.demoChipRemove}">&times;</button></span>
    `).join('');
    el.querySelectorAll('.demo-chip-remove').forEach(btn => {
        btn.onclick = () => onRemove(Number(btn.dataset.idx));
    });
}

function initApiDemos(ui, demosText) {
    const muleDt = demosText.find(d => d.id === 'mule') || {};
    const aceDt = demosText.find(d => d.id === 'ace') || {};

    // --- Mule: shared location-search autocomplete, reused by both the
    // single-city input and the compare-cities add-input below ---
    function createGeoAutocomplete(inputEl, suggestionsEl, onSelect, onEnterFallback) {
        let results = [];
        let highlightIndex = -1;
        let debounceTimer = null;

        function hide() {
            suggestionsEl.innerHTML = '';
            suggestionsEl.classList.add('is-hidden');
            results = [];
            highlightIndex = -1;
            inputEl.setAttribute('aria-expanded', 'false');
            inputEl.removeAttribute('aria-activedescendant');
        }

        function select(idx) {
            const r = results[idx];
            if (!r) return;
            hide();
            onSelect(r);
        }

        function updateHighlight() {
            suggestionsEl.querySelectorAll('.demo-geo-suggestion').forEach((btn, i) => {
                const active = i === highlightIndex;
                btn.classList.toggle('is-highlighted', active);
                btn.setAttribute('aria-selected', active ? 'true' : 'false');
                if (active) {
                    btn.scrollIntoView({ block: 'nearest' });
                    inputEl.setAttribute('aria-activedescendant', btn.id);
                }
            });
        }

        function render(newResults) {
            results = newResults;
            highlightIndex = -1;
            if (!results.length) { hide(); return; }
            suggestionsEl.innerHTML = results.map((r, i) => {
                const parts = [r.neighborhood, r.city, r.state, r.country].filter(Boolean);
                const uniqueParts = parts.filter((p, idx) => parts.indexOf(p) === idx);
                return `<button type="button" id="${suggestionsEl.id}-option-${i}" role="option" aria-selected="false" class="demo-geo-suggestion" data-idx="${i}">${escapeHtml(uniqueParts.join(', '))}</button>`;
            }).join('');
            suggestionsEl.classList.remove('is-hidden');
            inputEl.setAttribute('aria-expanded', 'true');
            suggestionsEl.querySelectorAll('.demo-geo-suggestion').forEach(btn => {
                btn.onclick = () => select(Number(btn.dataset.idx));
            });
        }

        inputEl.addEventListener('input', () => {
            const q = inputEl.value.trim();
            clearTimeout(debounceTimer);
            if (q.length < 3) { hide(); return; }
            debounceTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`https://mule-demo.matheusribeiro.dev.br/api/geocode?q=${encodeURIComponent(q)}`);
                    const data = await res.json();
                    render(data.results || []);
                } catch (err) { hide(); }
            }, 400);
        });

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' && results.length) {
                e.preventDefault();
                highlightIndex = (highlightIndex + 1) % results.length;
                updateHighlight();
            } else if (e.key === 'ArrowUp' && results.length) {
                e.preventDefault();
                highlightIndex = (highlightIndex - 1 + results.length) % results.length;
                updateHighlight();
            } else if (e.key === 'Enter') {
                if (highlightIndex >= 0 && results.length) {
                    e.preventDefault();
                    select(highlightIndex);
                } else if (onEnterFallback) {
                    e.preventDefault();
                    onEnterFallback();
                }
            } else if (e.key === 'Escape') {
                hide();
            }
        });

        inputEl.addEventListener('blur', () => setTimeout(hide, 150));
    }

    function wireQuickPicks(prefix, onPick) {
        document.querySelectorAll(`.demo-quick-pick[data-prefix="${prefix}"]`).forEach(btn => {
            btn.onclick = () => {
                const capital = CAPITAL_SUGGESTIONS[Number(btn.dataset.idx)];
                if (capital) onPick(capital.query);
            };
        });
    }

    // --- Mule: single city (with live location search via /api/geocode) ---
    const muleForm = document.getElementById('mule-demo-form');
    const muleResult = document.getElementById('mule-demo-result');
    const mulePretty = document.getElementById('mule-demo-pretty');
    const cityInput = document.getElementById('mule-demo-city');
    const suggestionsEl = document.getElementById('mule-geo-suggestions');
    let muleSelectedCity = null;

    function runMuleSingle(city) {
        if (!city || !muleResult) return;
        const btn = muleForm ? muleForm.querySelector('button[type="submit"]') : null;
        const url = `https://mule-demo.matheusribeiro.dev.br/api/weather?city=${encodeURIComponent(city)}`;
        runDemoCall(btn, muleResult, url, ui, mulePretty, (data) => renderWeatherSummary(data, ui));
    }

    if (cityInput && suggestionsEl) {
        createGeoAutocomplete(cityInput, suggestionsEl, (r) => {
            muleSelectedCity = r.city;
            const displayParts = [r.neighborhood, r.city].filter(Boolean).filter((p, i, a) => a.indexOf(p) === i);
            cityInput.value = displayParts.join(', ');
        });
        cityInput.addEventListener('input', () => { muleSelectedCity = null; });
    }

    if (muleForm && muleResult) {
        muleForm.onsubmit = (e) => {
            e.preventDefault();
            const city = muleSelectedCity || (cityInput ? cityInput.value.trim() : '');
            runMuleSingle(city);
        };
    }

    wireQuickPicks('mule-single', (query) => {
        muleSelectedCity = query;
        if (cityInput) cityInput.value = query;
        runMuleSingle(query);
    });

    // --- Mule: compare cities (also with live location search) ---
    let muleCompareCities = [];
    const muleCompareInput = document.getElementById('mule-compare-input');
    const muleCompareSuggestionsEl = document.getElementById('mule-compare-suggestions');
    const muleCompareAdd = document.getElementById('mule-compare-add');
    const muleCompareSubmit = document.getElementById('mule-compare-submit');

    function renderMuleChips() {
        renderChips('mule-compare-chips', muleCompareCities, ui, (idx) => {
            muleCompareCities.splice(idx, 1);
            renderMuleChips();
        });
    }
    function addCompareCity(city) {
        if (!city || muleCompareCities.length >= 5 || muleCompareCities.some(c => c.toLowerCase() === city.toLowerCase())) return;
        muleCompareCities.push(city);
        renderMuleChips();
    }
    function addMuleCityFromInput() {
        if (!muleCompareInput) return;
        const val = muleCompareInput.value.trim();
        if (!val) return;
        addCompareCity(val);
        muleCompareInput.value = '';
    }

    if (muleCompareInput && muleCompareSuggestionsEl) {
        createGeoAutocomplete(muleCompareInput, muleCompareSuggestionsEl, (r) => {
            addCompareCity(r.city);
            muleCompareInput.value = '';
        }, addMuleCityFromInput);
    }
    if (muleCompareAdd) muleCompareAdd.onclick = addMuleCityFromInput;
    if (muleCompareSubmit && muleResult) {
        muleCompareSubmit.onclick = () => {
            if (!muleCompareCities.length) return;
            const url = `https://mule-demo.matheusribeiro.dev.br/api/weather/compare?cities=${encodeURIComponent(muleCompareCities.join(','))}`;
            runDemoCall(muleCompareSubmit, muleResult, url, ui, mulePretty, (data) => renderCompareResults(data, ui));
        };
    }

    wireQuickPicks('mule-compare', (query) => addCompareCity(query));

    initDemoTabs('mule', 'mule-demo-result', 'mule-demo-pretty', (muleDt.resultPlaceholder || '').replace(/^←\s*/, ''));

    // --- ACE: convert ---
    const aceForm = document.getElementById('ace-demo-form');
    const aceResult = document.getElementById('ace-demo-result');
    const acePretty = document.getElementById('ace-demo-pretty');
    if (aceForm && aceResult) {
        aceForm.onsubmit = async (e) => {
            e.preventDefault();
            const from = document.getElementById('ace-demo-from').value;
            const to = document.getElementById('ace-demo-to').value;
            const amount = document.getElementById('ace-demo-amount').value.trim() || '1';
            const btn = aceForm.querySelector('button[type="submit"]');
            const url = `https://ace-demo.matheusribeiro.dev.br/api/currency?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`;
            runDemoCall(btn, aceResult, url, ui, acePretty, (data) => renderConvertSummary(data, ui));
        };
    }
    const aceSwap = document.getElementById('ace-demo-swap');
    if (aceSwap) {
        aceSwap.onclick = () => {
            const fromEl = document.getElementById('ace-demo-from');
            const toEl = document.getElementById('ace-demo-to');
            if (!fromEl || !toEl) return;
            const tmp = fromEl.value;
            fromEl.value = toEl.value;
            toEl.value = tmp;
        };
    }

    // --- ACE: rate table ---
    const aceRatesBtn = document.getElementById('ace-rates-submit');
    if (aceRatesBtn && aceResult) {
        aceRatesBtn.onclick = () => {
            const base = document.getElementById('ace-rates-base').value;
            const url = `https://ace-demo.matheusribeiro.dev.br/api/currency/rates?base=${encodeURIComponent(base)}`;
            runDemoCall(aceRatesBtn, aceResult, url, ui, acePretty, (data) => renderRatesTable(data, ui));
        };
    }

    // --- ACE: convert many ---
    let aceManyPairs = [];
    const aceManyFrom = document.getElementById('ace-many-from');
    const aceManyTo = document.getElementById('ace-many-to');
    const aceManyAdd = document.getElementById('ace-many-add');
    const aceManyAmount = document.getElementById('ace-many-amount');
    const aceManySubmit = document.getElementById('ace-many-submit');
    function renderAceManyChips() {
        renderChips('ace-many-chips', aceManyPairs, ui, (idx) => {
            aceManyPairs.splice(idx, 1);
            renderAceManyChips();
        });
    }
    if (aceManyAdd) {
        aceManyAdd.onclick = () => {
            if (!aceManyFrom || !aceManyTo || aceManyPairs.length >= 6) return;
            const from = aceManyFrom.value;
            const to = aceManyTo.value;
            if (from === to) return;
            const pair = `${from}-${to}`;
            if (aceManyPairs.includes(pair)) return;
            aceManyPairs.push(pair);
            renderAceManyChips();
        };
    }
    if (aceManySubmit && aceResult) {
        aceManySubmit.onclick = () => {
            if (!aceManyPairs.length) return;
            const amount = aceManyAmount ? (aceManyAmount.value.trim() || '1') : '1';
            const url = `https://ace-demo.matheusribeiro.dev.br/api/currency/convert-many?pairs=${encodeURIComponent(aceManyPairs.join(','))}&amount=${encodeURIComponent(amount)}`;
            runDemoCall(aceManySubmit, aceResult, url, ui, acePretty, (data) => renderManyResults(data, ui));
        };
    }

    initDemoTabs('ace', 'ace-demo-result', 'ace-demo-pretty', (aceDt.resultPlaceholder || '').replace(/^←\s*/, ''));
}

async function runDemoCall(triggerBtn, resultEl, url, ui, prettyEl, prettyRenderFn) {
    const originalBtnText = triggerBtn ? triggerBtn.textContent : null;
    if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = '...'; }
    if (prettyEl) prettyEl.innerHTML = '';
    resultEl.className = 'demo-result';
    resultEl.textContent = ui.demoLoadingText || 'Loading...';

    const start = performance.now();
    try {
        const res = await fetch(url);
        const elapsed = Math.round(performance.now() - start);
        const data = await res.json();
        resultEl.className = res.ok ? 'demo-result' : 'demo-result is-error';
        resultEl.innerHTML = `<div class="demo-meta">HTTP ${res.status} &middot; ${elapsed}ms</div>${syntaxHighlightJson(data)}`;
        if (prettyEl && prettyRenderFn) {
            try { prettyEl.innerHTML = prettyRenderFn(data); } catch (e) { /* pretty view is best-effort, raw JSON above always works */ }
        }
    } catch (err) {
        resultEl.className = 'demo-result is-error';
        const template = ui.demoErrorText || 'Request failed: {msg}. The demo VM may be asleep on the first request -- try again in a few seconds.';
        resultEl.textContent = template.replace('{msg}', err.message);
    } finally {
        if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = originalBtnText; }
    }
}

function syntaxHighlightJson(obj) {
    const json = JSON.stringify(obj, null, 2)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        (match) => {
            if (/^"/.test(match)) return `<span class="${/:$/.test(match) ? 'key' : 'str'}">${match}</span>`;
            if (/true|false|null/.test(match)) return match;
            return `<span class="num">${match}</span>`;
        }
    );
}

// --- Cursor "radar sense" glow (site-wide) ---
function initSpotlight() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spot = document.getElementById('site-spotlight');
    if(!spot || reduceMotion) return;

    let raf = null;
    document.addEventListener('mousemove', (e) => {
        if(raf) return;
        raf = requestAnimationFrame(() => {
            spot.style.setProperty('--mx', e.clientX + 'px');
            spot.style.setProperty('--my', e.clientY + 'px');
            raf = null;
        });
    });
}

// --- Helpers ---
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function showErrorUI(msg) {
    const main = document.querySelector('main');
    if(main) {
        main.innerHTML = `
            <div class="text-center mt-20 text-red-500 font-mono">
                <h2 class="text-xl font-bold">SYSTEM ERROR</h2>
                <p class="text-sm mt-2">${msg}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 border border-red-200 rounded hover:bg-red-50 text-xs uppercase">Reboot System</button>
            </div>
        `;
    }
}

// --- PDF GENERATOR (NEW) ---
let html2pdfLoadPromise = null;
function loadHtml2Pdf() {
    if (window.html2pdf) return Promise.resolve();
    if (!html2pdfLoadPromise) {
        html2pdfLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return html2pdfLoadPromise;
}

async function generatePDF() {
    const element = document.getElementById('cv-template');
    if(!element) return;

    // Feedback visual simples no botão
    const btnText = document.getElementById('nav-download-text');
    const originalText = btnText ? btnText.textContent : "Generate PDF";
    if(btnText) btnText.textContent = "Generating...";

    try {
        // 1. Carrega a lib de PDF só quando realmente precisa
        await loadHtml2Pdf();

        // 2. Popula o template com dados frescos
        renderPDFTemplate();

        // 3. Configurações do PDF
        const opt = {
            margin:       0,
            filename:     `CV_Matheus_Ribeiro_${currentLang.toUpperCase()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 4. Mostra e Gera
        element.classList.remove('hidden');
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error(err);
        alert('Error generating PDF');
    } finally {
        element.classList.add('hidden');
        if(btnText) btnText.textContent = originalText;
    }
}

function renderPDFTemplate() {
    const data = allData[currentLang];
    const common = allData.common;

    // Header
    setText('pdf-name', data.profile.name);
    setText('pdf-role', data.profile.role);
    
    // Contato
    const contactDiv = document.getElementById('pdf-contact');
    if(contactDiv) {
        contactDiv.innerHTML = `
            <span>${data.profile.location}</span> •
            <span>${data.profile.email}</span> •
            ${data.profile.phone ? `<span>${data.profile.phone}</span> • ` : ''}
            <span>linkedin.com/in/matheus-julio-ribeiro</span> •
            <span>github.com/MatthewJulioRibeiro</span>
        `;
    }

    // Resumo
    setText('pdf-summary', data.profile.summary);

    // Experiência
    const expDiv = document.getElementById('pdf-experience');
    if(expDiv) {
        expDiv.innerHTML = data.experience.map(job => `
            <div class="mb-4 break-inside-avoid">
                <div class="flex justify-between items-baseline mb-1">
                    <h4 class="font-bold text-md text-slate-900">${job.company}</h4>
                    <span class="text-xs text-slate-500 font-mono">${job.period}</span>
                </div>
                <div class="text-sm font-medium text-ibm-blue mb-1">${job.role}</div>
                ${Array.isArray(job.description)
                    ? `<ul class="text-xs text-slate-700 leading-snug list-disc pl-4 space-y-0.5">${job.description.map(d => `<li>${d}</li>`).join('')}</ul>`
                    : `<p class="text-xs text-slate-700 leading-snug text-justify">${job.description}</p>`}
            </div>
        `).join('');
    }

    // Projetos
    const projDiv = document.getElementById('pdf-projects');
    if(projDiv) {
        projDiv.innerHTML = data.projects.map(p => `
            <div class="mb-3 break-inside-avoid">
                <h4 class="font-bold text-sm text-slate-900">${p.title}</h4>
                <p class="text-xs text-slate-700 leading-snug mb-1">${p.description}</p>
                <div class="text-[10px] text-slate-500 font-mono">Stack: ${p.tech.join(', ')}</div>
            </div>
        `).join('');
    }

    // Skills
    const skillsDiv = document.getElementById('pdf-skills');
    if(skillsDiv) {
        skillsDiv.innerHTML = common.skills.map(cat => `
            <div class="mb-3 break-inside-avoid">
                <h5 class="font-bold text-xs text-slate-800 mb-1">${currentLang === 'pt' ? cat.category_pt : cat.category}</h5>
                <p class="text-xs text-slate-600 leading-tight">${cat.items.join(', ')}</p>
            </div>
        `).join('');
    }

    // Educação
    const eduDiv = document.getElementById('pdf-education');
    if(eduDiv) {
        eduDiv.innerHTML = data.education.map(e => `
            <div class="break-inside-avoid">
                <div class="font-bold text-xs text-slate-900">${e.institution}</div>
                <div class="text-xs text-slate-700">${e.degree}</div>
                <div class="text-[10px] text-slate-500">${e.period}</div>
            </div>
        `).join('');
    }

    // Idiomas
    const langDiv = document.getElementById('pdf-languages');
    if(langDiv) {
        langDiv.innerHTML = common.languages.map(l => `
            <div class="flex justify-between items-center mb-1">
                <span class="text-slate-800">${l.name}</span>
                <span class="text-slate-500 text-[10px] uppercase">${l.level}</span>
            </div>
        `).join('');
    }
}

// --- Command Palette ---
function initCommandPalette() {
    const modal = document.getElementById('command-palette');
    const input = document.getElementById('palette-input');
    const results = document.getElementById('palette-results');

    window.openPalette = () => {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('open'));
        input.focus();
        renderResults('');
    };

    window.closePalette = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.classList.add('hidden'), 200);
        input.value = '';
    };

    const actions = [
        { label: 'Jump to Experience', sub: 'Section', action: () => document.getElementById('experience-list')?.scrollIntoView({behavior: 'smooth'}) },
        { label: 'Jump to Stack', sub: 'Section', action: () => document.getElementById('core-stack')?.scrollIntoView({behavior: 'smooth'}) },
        { label: 'Jump to Projects', sub: 'Section', action: () => document.getElementById('projects-grid')?.scrollIntoView({behavior: 'smooth'}) },
        // Ação atualizada para chamar o novo gerador
        { label: 'Generate PDF', sub: 'Action', action: () => generatePDF() },
        { label: 'Send Email', sub: 'Action', action: () => document.getElementById('email-btn')?.click() },
        { label: 'Open LinkedIn', sub: 'External', action: () => document.getElementById('linkedin-btn-header')?.click() },
        { label: 'Open GitHub', sub: 'External', action: () => document.getElementById('github-btn-header')?.click() },
        { label: 'Toggle Dark Mode', sub: 'Config', action: () => document.getElementById('theme-toggle').click() },
        { label: 'Switch Language: PT', sub: 'Config', action: () => setLanguage('pt') },
        { label: 'Switch Language: EN', sub: 'Config', action: () => setLanguage('en') }
    ];

    function renderResults(term) {
        const filtered = actions.filter(a => a.label.toLowerCase().includes(term.toLowerCase()));
        
        if(filtered.length === 0) {
            results.innerHTML = '<div class="p-4 text-center text-xs text-slate-400 font-mono">No matching commands</div>';
            return;
        }

        results.innerHTML = filtered.map((item, i) => `
            <div class="palette-item ${i === 0 ? 'active' : ''}" onclick="execAction(${i})">
                <span>${item.label}</span>
                <span class="cmd-key">${item.sub}</span>
            </div>
        `).join('');
        
        results.dataset.actions = JSON.stringify(filtered);
    }

    window.execAction = (index) => {
        const currentActions = JSON.parse(results.dataset.actions);
        const actionLabel = currentActions[index].label;
        const originalAction = actions.find(a => a.label === actionLabel);
        if(originalAction) {
            originalAction.action();
            closePalette();
        }
    };

    if(input) input.addEventListener('input', (e) => renderResults(e.target.value));
    
    document.addEventListener('keydown', (e) => {
        if((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            modal.classList.contains('open') ? closePalette() : openPalette();
        }
        if(e.key === 'Escape') closePalette();
        if(e.key === 'Enter' && modal.classList.contains('open')) {
            const first = results.querySelector('.palette-item');
            if(first) first.click();
        }
    });
}