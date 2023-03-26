/* global api */
class Cambridge {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        return 'Cambridge';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let promises = [this.findCambridge(word)];
        let results = await Promise.all(promises);
        return [].concat(...results).filter(x => x);
    }

    async findCambridge(word) {
        let notes = [];
        if (!word) return notes; // return empty notes

        function T(node) {
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        let base = 'https://dictionary.cambridge.org/search/english/direct/?q=';
        let url = base + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        let entries = doc.querySelectorAll('.pr .entry-body__el') || [];
        for (const entry of entries) {
            let definitions = [];
            let audios = [];

            let expression = T(entry.querySelector('.headword'));
            let reading = '';
            let readings = entry.querySelectorAll('.pron .ipa');
            if (readings) {
                let reading_us = T(readings[1]);
                reading = (reading_us) ? `/${reading_us}/` : '';
            }
            let pos = T(entry.querySelector('.posgram'));
            pos = pos ? `‣<span class='pos'>${pos}</span>` : '';
            audios[0] = entry.querySelector(".uk.dpron-i source");
            audios[0] = audios[0] ? 'https://dictionary.cambridge.org' + audios[0].getAttribute('src') : '';
            //audios[0] = audios[0].replace('https', 'http');
            audios[1] = entry.querySelector(".us.dpron-i source");
            audios[1] = audios[1] ? 'https://dictionary.cambridge.org' + audios[1].getAttribute('src') : '';
            //audios[1] = audios[1].replace('https', 'http');

            let sensbodys = entry.querySelectorAll('.sense-body') || [];
            for (const sensbody of sensbodys) {
                let sensblocks = sensbody.childNodes || [];
                for (const sensblock of sensblocks) {
                    let phrasehead = '';
                    let defblocks = [];
                    if (sensblock.classList && sensblock.classList.contains('phrase-block')) {
                        phrasehead = T(sensblock.querySelector('.phrase-title'));
                        phrasehead = phrasehead ? `<div class="cloze">${phrasehead}</div>` : '';
                        defblocks = sensblock.querySelectorAll('.def-block') || [];
                    }
                    if (sensblock.classList && sensblock.classList.contains('def-block')) {
                        defblocks = [sensblock];
                    }
                    if (defblocks.length <= 0) continue;

                    // make definition segement
                    for (const defblock of defblocks) {
                        let eng_tran = T(defblock.querySelector('.ddef_h .def'));
                        if (!eng_tran) continue;
                        let definition = '';
                        eng_tran = `${eng_tran.replace(RegExp(expression, 'gi'),`<span class='cloze'>${expression}</span>`)}`;
                        let tran = `&nbsp;<span class='tran'>${eng_tran}</span>`;
                        definition += phrasehead ? `${phrasehead}${tran}` : `${pos}${tran}`;

                        let examps = defblock.querySelectorAll('.def-body .examp') || [];
                        if (examps.length > 0 && this.maxexample > 0) {
                            definition += '<ul class="sents">';
                            for (const [index, examp] of examps.entries()) {
                                if (index > this.maxexample - 1) break; // to control only 2 example sentence.
                                let eng_examp = T(examp.querySelector('.eg'));
                                definition += `<li class='sent'>${eng_examp.replace(RegExp(expression, 'gi'),`<span class='cloze'>${expression}</span>`)}</li>`;
                            }
                            definition += '</ul>';
                        }
                        definition && definitions.push(definition);
                    }
                }
            }
            let css = this.renderCSS();
            notes.push({
                css,
                expression,
                reading,
                definitions,
                audios
            });
        }
        return notes;
    }


    renderCSS() {
        let css = `
            <style>
                span.pos  {font-size:0.9em; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                .cloze {font-weight: 700;}
                ul.sents {font-size:0.9em; list-style:square inside; margin:3px 0; padding:5px; background:rgba(13,71,161,0.1); border-radius:5px;}
            </style>`;
        return css;
    }
}
