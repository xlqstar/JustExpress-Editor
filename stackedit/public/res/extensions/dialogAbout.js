define([
    "underscore",
    "constants",
    "utils",
    "classes/Extension",
    "text!html/dialogAbout.html",
], function(_, constants, utils, Extension, dialogAboutHTML) {

    var dialogAbout = new Extension("dialogAbout", 'Dialog "About"');

    var libraries = {
        "ACE": "http://ace.c9.io/",
        "Bootstrap": "http://getbootstrap.com/",
        "Bootstrap Tour": "http://bootstraptour.com/",
        "crel": "https://github.com/KoryNunn/crel",
        "Dropbox-js": "https://github.com/dropbox/dropbox-js",
        "FileSaver.js": "https://github.com/eligrey/FileSaver.js/",
        "Fontello": "http://fontello.com/",
        "Font Awesome and others...": "res/libs/fontello/LICENSE.txt",
        "Gatekeeper": "https://github.com/prose/gatekeeper",
        "Github.js": "https://github.com/michael/github",
        "Highlight.js": "http://softwaremaniacs.org/soft/highlight/en/",
        "jGrowl": "https://github.com/stanlemon/jGrowl/",
        "jQuery": "http://jquery.com/",
        "lz-string": "http://pieroxy.net/blog/pages/lz-string/index.html",
        "MathJax": "http://www.mathjax.org/",
        "Mousetrap": "http://craig.is/killing/mice",
        "PageDown ACE": "https://github.com/benweet/pagedown-ace",
        "PageDown Extra": "https://github.com/jmcmanus/pagedown-extra/",
        "Prettify": "https://code.google.com/p/google-code-prettify/",
        "RequireJS": "http://requirejs.org/",
        "RequireJS LESS plugin": "https://github.com/guybedford/require-less",
        "stacktrace.js": "http://stacktracejs.com/",
        "to-markdown": "https://github.com/domchristie/to-markdown",
        "Typo.js": "https://github.com/cfinke/Typo.js",
        "UI Layout": "http://layout.jquery-dev.net/",
        "Underscore.js": "http://underscorejs.org/",
        "waitForImages": "https://github.com/alexanderdickson/waitForImages",
        "XRegExp": "https://github.com/slevithan/xregexp",
        "yaml.js": "https://github.com/jeremyfa/yaml.js"
    };

    var projects = {
        "StackEdit Download Proxy": "https://github.com/benweet/stackedit-download-proxy",
        "StackEdit HTMLtoPDF": "https://github.com/benweet/stackedit-htmltopdf",
        "StackEdit Picasa Proxy": "https://github.com/benweet/stackedit-picasa-proxy",
        "StackEdit SSH Proxy": "https://github.com/benweet/stackedit-ssh-proxy",
        "StackEdit Tumblr Proxy": "https://github.com/benweet/stackedit-tumblr-proxy",
        "StackEdit WordPress Proxy": "https://github.com/benweet/stackedit-wordpress-proxy",
    };

    dialogAbout.onReady = function() {
        utils.addModal('modal-about', _.template(dialogAboutHTML, {
            libraries: libraries,
            projects: projects,
            version: constants.VERSION
        }));
    };

    return dialogAbout;

});