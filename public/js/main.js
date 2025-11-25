let currentLang = 'en'; 
let allData = {};
let typeWriterTimeout;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    
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
        if(linkedin) linkedin.href = allData[currentLang].profile.linkedin;
        if(email) email.href = `mailto:${allData[currentLang].profile.email}`;
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

    // Sections
    renderCoreStack(common.skills);
    renderExperience(data.experience);
    renderProjects(data.projects);
    renderSkillsGrid(common.skills);
    renderEducation(data.education);
    renderLanguages(common.languages);
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

function renderExperience(experience) {
    const container = document.getElementById('experience-list');
    if(!container) return;

    container.innerHTML = experience.map(job => `
        <div class="relative group">
            <div class="absolute -left-[39px] top-1.5 w-3 h-3 bg-white dark:bg-[#161616] border-2 border-slate-300 dark:border-slate-700 rounded-full group-hover:border-ibm-blue transition-colors"></div>
            
            <div class="flex flex-col md:flex-row md:justify-between md:items-baseline mb-2">
                <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">${job.company}</h4>
                <span class="text-xs font-mono text-slate-500 dark:text-slate-400">${job.period}</span>
            </div>
            
            <div class="text-sm font-medium text-ibm-blue font-mono mb-3">${job.role}</div>
            
            <p class="text-slate-700 dark:text-slate-300 text-base leading-relaxed">
                ${job.description}
            </p>
        </div>
    `).join('');
}

function renderProjects(projects) {
    const container = document.getElementById('projects-grid');
    if(!container) return;

    if(!projects || projects.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm font-mono">No projects loaded.</p>';
        return;
    }

    container.innerHTML = projects.map(proj => `
        <div class="project-card rounded-lg cursor-default">
            <h4 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 font-sans">${proj.title}</h4>
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">${proj.description}</p>
            <div class="flex flex-wrap gap-2">
                ${proj.tech.map(t => `<span class="text-xs font-mono text-ibm-blue bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">${t}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function renderSkillsGrid(skills) {
    const container = document.getElementById('skills-grid');
    if(!container) return;

    container.innerHTML = skills.map(cat => `
        <div>
            <h4 class="font-sans font-bold text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors">
                ${cat.category}
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
async function generatePDF() {
    const element = document.getElementById('cv-template');
    if(!element) return;

    // 1. Popula o template com dados frescos
    renderPDFTemplate();

    // 2. Configurações do PDF
    const opt = {
        margin:       0,
        filename:     `CV_Matheus_Ribeiro_${currentLang.toUpperCase()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 3. Mostra, Gera e Esconde
    element.classList.remove('hidden');
    
    // Feedback visual simples no botão
    const btnText = document.getElementById('nav-download-text');
    const originalText = btnText ? btnText.textContent : "Generate PDF";
    if(btnText) btnText.textContent = "Generating...";

    try {
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
            <span>linkedin.com/in/matheus-julio-ribeiro</span>
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
                <p class="text-xs text-slate-700 leading-snug text-justify">${job.description}</p>
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
                <h5 class="font-bold text-xs text-slate-800 mb-1">${cat.category}</h5>
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