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

function renderApiDemos(demosCommon, demosText, ui) {
    const container = document.getElementById('demos-grid');
    if (!container || !demosCommon || !demosText) return;

    container.innerHTML = demosCommon.map(dc => {
        const dt = demosText.find(d => d.id === dc.id);
        if (!dt) return '';

        if (dc.id === 'mule') {
            return `
                <div class="project-card rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">${dt.title} <span class="text-xs font-mono text-ibm-blue align-middle">${dt.badge}</span></h4>
                    </div>
                    <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">${dt.description}</p>
                    ${DEMO_SVGS.mule}
                    <form id="mule-demo-form" class="grid grid-cols-[1fr_auto] gap-2 mb-3">
                        <input type="text" id="mule-demo-city" class="form-input" placeholder="${dt.inputPlaceholder}" required />
                        <button type="submit" class="px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] bg-[#1A1210] dark:bg-[#EDE3D8] text-white dark:text-[#1A1210] text-sm font-mono hover:bg-ibm-blue hover:border-ibm-blue dark:hover:bg-ibm-blue dark:hover:border-ibm-blue dark:hover:text-white transition-all whitespace-nowrap">${dt.submitBtn}</button>
                    </form>
                    <pre id="mule-demo-result" class="demo-result"><code>&larr; ${dt.resultPlaceholder.replace(/^←\s*/, '')}</code></pre>
                    <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#1A1210]/10 dark:border-[#EDE3D8]/10">
                        <a href="${dc.repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-github"></i>${ui.demoCodeBtn}</a>
                        <a href="${dc.docsUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-file-earmark-text"></i>${ui.demoSwaggerBtn}</a>
                        <a href="${dc.extraUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-box-arrow-up-right"></i>${dt.extraLabel}</a>
                    </div>
                </div>`;
        }

        return `
            <div class="project-card rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">${dt.title} <span class="text-xs font-mono text-ibm-royal align-middle">${dt.badge}</span></h4>
                </div>
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">${dt.description}</p>
                ${DEMO_SVGS.ace}
                <form id="ace-demo-form" class="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-3">
                    <input type="text" id="ace-demo-from" class="form-input" placeholder="${dt.fromPlaceholder}" maxlength="3" required />
                    <input type="text" id="ace-demo-to" class="form-input" placeholder="${dt.toPlaceholder}" maxlength="3" required />
                    <input type="number" id="ace-demo-amount" class="form-input" placeholder="100" value="100" min="0" step="any" />
                    <button type="submit" class="px-4 py-2 border-2 border-[#1A1210] dark:border-[#EDE3D8] bg-[#1A1210] dark:bg-[#EDE3D8] text-white dark:text-[#1A1210] text-sm font-mono hover:bg-ibm-blue hover:border-ibm-blue dark:hover:bg-ibm-blue dark:hover:border-ibm-blue dark:hover:text-white transition-all whitespace-nowrap">${dt.submitBtn}</button>
                </form>
                <pre id="ace-demo-result" class="demo-result"><code>&larr; ${dt.resultPlaceholder.replace(/^←\s*/, '')}</code></pre>
                <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#1A1210]/10 dark:border-[#EDE3D8]/10">
                    <a href="${dc.repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-github"></i>${ui.demoCodeBtn}</a>
                    <a href="${dc.docsUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-file-earmark-text"></i>${ui.demoSwaggerBtn}</a>
                    <a href="${dc.extraUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-[#1A1210] dark:text-[#EDE3D8] hover:text-ibm-blue dark:hover:text-ibm-blue transition-colors"><i class="bi bi-box-arrow-up-right"></i>${dt.extraLabel}</a>
                </div>
            </div>`;
    }).join('');

    initApiDemos(ui);
}

function initApiDemos(ui) {
    const muleForm = document.getElementById('mule-demo-form');
    const muleResult = document.getElementById('mule-demo-result');
    if (muleForm && muleResult) {
        muleForm.onsubmit = async (e) => {
            e.preventDefault();
            const city = document.getElementById('mule-demo-city').value.trim();
            if (!city) return;
            runDemoCall(muleForm, muleResult,
                `https://mule-demo.matheusribeiro.dev.br/api/weather?city=${encodeURIComponent(city)}`, ui);
        };
    }

    const aceForm = document.getElementById('ace-demo-form');
    const aceResult = document.getElementById('ace-demo-result');
    if (aceForm && aceResult) {
        aceForm.onsubmit = async (e) => {
            e.preventDefault();
            const from = document.getElementById('ace-demo-from').value.trim().toUpperCase();
            const to = document.getElementById('ace-demo-to').value.trim().toUpperCase();
            const amount = document.getElementById('ace-demo-amount').value.trim() || '1';
            if (!from || !to) return;
            runDemoCall(aceForm, aceResult,
                `https://ace-demo.matheusribeiro.dev.br/api/currency?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`, ui);
        };
    }
}

async function runDemoCall(form, resultEl, url, ui) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : null;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }
    resultEl.className = 'demo-result';
    resultEl.textContent = ui.demoLoadingText || 'Loading...';

    try {
        const res = await fetch(url);
        const data = await res.json();
        resultEl.className = res.ok ? 'demo-result' : 'demo-result is-error';
        resultEl.innerHTML = syntaxHighlightJson(data);
    } catch (err) {
        resultEl.className = 'demo-result is-error';
        const template = ui.demoErrorText || 'Request failed: {msg}. The demo VM may be asleep on the first request -- try again in a few seconds.';
        resultEl.textContent = template.replace('{msg}', err.message);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
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