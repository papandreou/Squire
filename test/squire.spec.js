/*global Squire, sinon, unexpected, unexpectedSinon, describe, afterEach, beforeEach, it */
(function () {
    'use strict';

var expect = unexpected.clone()
    .installPlugin(unexpectedSinon)
    .addType({
        name: 'SquireRTE',
        base: 'object',
        identify: function (value) {
            return value instanceof Squire;
        },
        inspect: function (value, depth, output) {
            output.text('Squire RTE: ' + value.getHTML());
        }
    })
    .addAssertion('SquireRTE', '[not] to contain HTML', function (expect, editor, expectedValue) {
        var actualHTML = editor.getHTML().replace(/<br>/g, '');
        // BR tags are inconsistent across browsers. Removing them allows cross-browser testing.
        expect(actualHTML, '[not] to be', expectedValue);
    })
    .addAssertion('SquireRTE', '[not] to fire', function (expect, editor, event, _, activity) {
        this.errorMode = 'nested';
        if (typeof _ === 'function') {
            activity = _;
        }
        return expect.promise(function (run) {
            setTimeout(run(function () {
                var handlerSpy = sinon.spy();
                editor.addEventListener(event, handlerSpy);
                activity();
                setTimeout(run(function () {
                    expect(handlerSpy, 'was [not] called');
                }), 2);
            }, 2));
        });
    });

describe('Squire RTE', function () {
    var doc, editor, iframe;
    beforeEach(function (done) {
        iframe = document.createElement('IFRAME');
        iframe.style.visibility = 'hidden';
        iframe.addEventListener('load', function () {
            doc = iframe.contentDocument;
            editor = new Squire(doc);
            done();
        });
        document.body.appendChild(iframe);
    });

    function selectAll(editor) {
        var range = doc.createRange();
        range.setStart(doc.body.childNodes.item(0), 0);
        range.setEnd(doc.body.childNodes.item(0), doc.body.childNodes.item(0).childNodes.length);
        editor.setSelection(range);
    }

    describe('addEventListener', function () {
        describe('input', function () {
            it('fires when editor content is changed', function () {
                var startHTML = '<div>aaa</div>';
                editor.setHTML(startHTML);
                expect(editor, 'to contain HTML', startHTML);
                return expect(editor, 'to fire', 'input', 'when calling', function () {
                    // doc.body.childNodes.item(0).appendChild( doc.createTextNode('bbb'));
                    var range = doc.createRange();
                    range.setStart(doc.body.childNodes.item(0), 0);
                    range.setEnd(doc.body.childNodes.item(0), doc.body.childNodes.item(0).childNodes.length);
                    editor.setSelection(range);
                    editor.bold();
                });
            });
        });
    });

    describe('removeAllFormatting', function () {
        // Trivial cases
        it('removes inline styles', function () {
            var startHTML = '<div><i>one</i> <b>two</b> <u>three</u> <sub>four</sub> <sup>five</sup></div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            selectAll(editor);
            editor.removeAllFormatting();
            expect(editor, 'to contain HTML', '<div>one two three four five</div>');
        });
        it('removes block styles', function () {
            var startHTML = '<div><blockquote>one</blockquote><ul><li>two</li></ul>' +
                '<ol><li>three</li></ol><table><tbody><tr><th>four</th><td>five</td></tr></tbody></table></div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            selectAll(editor);
            editor.removeAllFormatting();
            var expectedHTML = '<div>one</div><div>two</div><div>three</div><div>four</div><div>five</div>';
            expect(editor, 'to contain HTML', expectedHTML);
        });

        // Potential bugs
        it('removes styles that begin inside the range', function () {
            var startHTML = '<div>one <i>two three four five</i></div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            var range = doc.createRange();
            range.setStart(doc.body.childNodes.item(0), 0);
            range.setEnd(doc.getElementsByTagName('i').item(0).childNodes.item(0), 4);
            editor.removeAllFormatting(range);
            expect(editor, 'to contain HTML', '<div>one two <i>three four five</i></div>');
        });

        it('removes styles that end inside the range', function () {
            var startHTML = '<div><i>one two three four</i> five</div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            var range = doc.createRange();
            range.setStart(doc.getElementsByTagName('i').item(0).childNodes.item(0), 13);
            range.setEnd(doc.body.childNodes.item(0), doc.body.childNodes.item(0).childNodes.length);
            editor.removeAllFormatting(range);
            expect(editor, 'to contain HTML', '<div><i>one two three</i> four five</div>');
        });

        it('removes styles enclosed by the range', function () {
            var startHTML = '<div>one <i>two three four</i> five</div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            var range = doc.createRange();
            range.setStart(doc.body.childNodes.item(0), 0);
            range.setEnd(doc.body.childNodes.item(0), doc.body.childNodes.item(0).childNodes.length);
            editor.removeAllFormatting(range);
            expect(editor, 'to contain HTML', '<div>one two three four five</div>');
        });

        it('removes styles enclosing the range', function () {
            var startHTML = '<div><i>one two three four five</i></div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            var range = doc.createRange();
            range.setStart(doc.getElementsByTagName('i').item(0).childNodes.item(0), 4);
            range.setEnd(doc.getElementsByTagName('i').item(0).childNodes.item(0), 18);
            editor.removeAllFormatting(range);
            expect(editor, 'to contain HTML', '<div><i>one </i>two three four<i> five</i></div>');
        });

        it('removes nested styles and closes tags correctly', function () {
            var startHTML = '<table><tbody><tr><td>one</td></tr><tr><td>two</td><td>three</td></tr><tr><td>four</td><td>five</td></tr></tbody></table>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            var range = doc.createRange();
            range.setStart(doc.getElementsByTagName('td').item(1), 0);
            range.setEnd(doc.getElementsByTagName('td').item(2), doc.getElementsByTagName('td').item(2).childNodes.length);
            editor.removeAllFormatting(range);
            expect(editor, 'to contain HTML', '<table><tbody><tr><td>one</td></tr></tbody></table>' +
                '<div>two</div>' +
                '<div>three</div>' +
                '<table><tbody><tr><td>four</td><td>five</td></tr></tbody></table>');
        });
    });

    afterEach(function () {
        editor = null;
        document.body.removeChild(iframe);
        iframe = null;
    });
});

})();
