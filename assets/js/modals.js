/**
 * modals.js — shared modal logic for abstract, citation, and diagram modals.
 * Include on any page that renders publication cards.
 *
 * Depends on: modals.html being loaded into the DOM first.
 * Load order:  <script src="js/modals.js"></script>  (after the modal HTML is in the DOM)
 */

// ── Abstract modal ────────────────────────────────────────────────────────────

let _abstractTimeout = null;

function typeWriter(text, element, speed = 20) {
    element.innerHTML = '';
    element.classList.remove('text-balance');
    element.classList.add('typing');
    let i = 0;

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            _abstractTimeout = setTimeout(type, speed);
        } else {
            setTimeout(() => element.classList.remove('typing'), 2000);
        }
    }

    type();
}

function showAbstractModal(text) {
    const modal = document.getElementById('abstractModal');
    const el    = document.getElementById('abstractText');

    modal.classList.remove('hidden');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.transition = 'opacity 300ms ease-out';
        modal.style.opacity = '1';
    }, 10);

    if (_abstractTimeout) clearTimeout(_abstractTimeout);
    typeWriter(text, el, 20);
}

function closeAbstractModal() {
    const modal = document.getElementById('abstractModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
        if (_abstractTimeout) clearTimeout(_abstractTimeout);
        const el = document.getElementById('abstractText');
        el.innerHTML = '';
        el.classList.remove('typing');
    }, 300);
}

// Close on backdrop click
document.addEventListener('click', function (e) {
    if (e.target === document.getElementById('abstractModal')) closeAbstractModal();
});


// ── Citation modal ────────────────────────────────────────────────────────────

let _currentCitation = '';

function showCitationModal(citation) {
    _currentCitation = citation;
    const modal = document.getElementById('citationModal');
    document.getElementById('citationText').textContent = citation;

    modal.classList.remove('hidden');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.transition = 'opacity 300ms ease-out';
        modal.style.opacity = '1';
    }, 10);
}

function closeCitationModal() {
    const modal = document.getElementById('citationModal');
    modal.style.opacity = '0';
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function copyCitation() {
    if (!_currentCitation) return;
    navigator.clipboard.writeText(_currentCitation).then(() => {
        const btn = event.currentTarget;
        const original = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        setTimeout(() => btn.innerHTML = original, 2000);
    });
}

// Close on backdrop click
document.addEventListener('click', function (e) {
    if (e.target === document.getElementById('citationModal')) closeCitationModal();
});


// ── Diagram modal ─────────────────────────────────────────────────────────────

let _diagSlides = [];
let _diagIdx    = 0;

function showDiagramModal(slides, _caption, _title) {
    _diagSlides = Array.isArray(slides)
        ? slides
        : [{ src: slides, caption: _caption, title: _title ?? 'Diagram' }];
    _diagIdx = 0;
    _renderDiagramSlide();

    const modal = document.getElementById('diagramModal');
    modal.classList.remove('hidden');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.transition = 'opacity 300ms ease-out';
        modal.style.opacity = '1';
    }, 10);
}

function _renderDiagramSlide() {
    const { src, caption, title = 'Diagram' } = _diagSlides[_diagIdx];
    const multi = _diagSlides.length > 1;

    const counter  = document.getElementById('diagramCounter');
    const prevBtn  = document.getElementById('diagramPrev');
    const nextBtn  = document.getElementById('diagramNext');

    if (multi) {
        counter.textContent = `${_diagIdx + 1} / ${_diagSlides.length}`;
        counter.classList.remove('hidden');
    } else {
        counter.classList.add('hidden');
    }

    prevBtn.classList.toggle('hidden', !multi);
    nextBtn.classList.toggle('hidden', !multi);
    prevBtn.disabled     = _diagIdx === 0;
    nextBtn.disabled     = _diagIdx === _diagSlides.length - 1;
    prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';
    nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';

    const embedEl = document.getElementById('diagramImage');
    embedEl.src   = src.toLowerCase().endsWith('.pdf') ? src + '#view=FitH&toolbar=0' : src;

    document.getElementById('diagramCaption').innerHTML = caption;
    document.getElementById('diagramTitle').innerHTML =
        `<i class="fa-solid fa-diagram-project text-blue-500"></i> ${title}`;
}

function stepDiagram(dir) {
    const next = _diagIdx + dir;
    if (next < 0 || next >= _diagSlides.length) return;
    _diagIdx = next;
    _renderDiagramSlide();
}

function closeDiagramModal() {
    const modal = document.getElementById('diagramModal');
    modal.style.opacity = '0';
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// Close on backdrop click
document.addEventListener('click', function (e) {
    if (e.target === document.getElementById('diagramModal')) closeDiagramModal();
});