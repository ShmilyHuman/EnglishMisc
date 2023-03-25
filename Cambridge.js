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
            pos = pos ? `<span class='pos'>${pos}</span>` : '';
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
                        let tran = `<span class='tran'>${eng_tran}</span>`;
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
                span.pos  {font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                .cloze {font-weight: 700;}
                ul.sents {font-size:0.9em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
            </style>`;
        return css;
    }
}
/* global api */
class CollinsEN {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        return 'CollinsCN';
    }


    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let list = [];
        let word_stem = await api.deinflect(word) || [];
        if (word.toLowerCase() != word) {
            let lowercase = word.toLowerCase();
            let lowercase_stem = await api.deinflect(lowercase) || [];
            list = [word, word_stem, lowercase, lowercase_stem];
        } else {
            list = [word, word_stem];
        }
        let promises = list.map((item) => this.findCollins(item));
        let results = await Promise.all(promises);
        return [].concat(...results).filter(x => x);
    }

    async findCollins(word) {
        const maxexample = this.maxexample;
        let notes = [];

        if (!word) return notes;
        let result = {};
        try {
            result = JSON.parse(await api.getBuiltin('collins', word));
        } catch (err) {
            return [];
        }

        //get Collins Data
        if (!result) return notes;
        let expression = word;
        let reading = '';
        if (result.readings && result.readings.length > 0) {
            reading = `/${result.readings[0]}/`;
            //let lable = ['UK','US'];
            //for (const [idx,rd] of result.readings.entries()){
            //    if (idx > 1) break;
            //    reading = reading + `${lable[idx]}[${rd}]`;
            //}
        }
        let extrainfo = result.star;
        let defs = result.defs;

        extrainfo = extrainfo ? `<span class="star">${extrainfo}</span>` : '';
        let audios = [];
        audios[0] = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(expression)}&type=1`;
        audios[1] = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(expression)}&type=2`;

        let definitions = [];
        for (const def of defs) {
            let definition = '';
            let pos = def.pos_en;
            let eng_tran = def.def_en;
            pos = pos ? `<span class="pos">${pos}</span>` : '';
            eng_tran = eng_tran ? `<span class="eng_tran">${eng_tran.replace(RegExp(expression, 'gi'),`<span class='cloze'>${expression}</span>`)}</span>` : '';
            definition = `${pos}<span class="tran">${eng_tran}</span>`;

            // make exmaple sentence segement
            if (def.ext && def.ext.length > 0 && maxexample > 0) {
                definition += '<ul class="sents">';
                for (const [idx, ex] of def.ext.entries()) {
                    if (idx > maxexample - 1) break; // to control only n example sentences defined in option.
                    let eng_sent = ex.ext_en.replace(RegExp(expression, 'gi'),`<span class='cloze'>${expression}</span>`);
                    definition += `<li class='sent'><span class='eng_sent'>${eng_sent}</span></li>`;
                }
                definition += '</ul>';
            }

            definitions.push(definition);
        }

        let css = this.renderCSS();
        notes.push({
            css,
            expression,
            reading,
            extrainfo,
            definitions,
            audios
        });

        return notes;
    }

    renderCSS() {
        let css = `
            <style>
                span.star {color: #FFBB00;}
                span.cloze {color: #1d4ed8; font-weight: 700;}
                span.cet  {margin: 0 3px;padding: 0 3px;font-weight: normal;font-size: 0.8em;color: white;background-color: #5cb85c;border-radius: 3px;}
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {:3px; padding:0;}
                ul.sents {font-size:0.9em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
            </style>`;
        return css;
    }
}
