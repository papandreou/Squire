/*global unexpected, describe, afterEach, beforeEach, it, Squire */
(function () {
'use strict';
var expect = unexpected.clone()
    .installPlugin(unexpected.dom)
    .addType({
        name: 'SquireRTE',
        base: 'object',
        identify: function (value) {
            return value instanceof Squire;
        },
        inspect: function (value, depth, output) {
            return output.text('Squire RTE: ').code(value.getHTML(), 'html');
        }
    })
    .addAssertion('SquireRTE', '[not] to contain HTML', function (expect, editor, expectedValue) {
        expect.errorMode ='nested';
        var actualHTML = editor.getHTML();
        if (typeof expectedValue === 'string') {
            // BR tags are inconsistent across browsers. Removing them allows cross-browser testing.
            return expect(actualHTML.replace(/<br>/g, ''), '[not] to be', expectedValue);
        } else {
            return expect(actualHTML, 'when parsed as HTML', '[not] to satisfy', expectedValue);
        }
    });

describe('Squire RTE', function () {
    var doc, editor;
    beforeEach(function () {
        var iframe = document.getElementById('testFrame');
        doc = iframe.contentDocument;
        editor = new Squire(doc);
    });

    function selectAll(editor) {
        var range = doc.createRange();
        range.setStart(doc.body.childNodes.item(0), 0);
        range.setEnd(doc.body.childNodes.item(0), doc.body.childNodes.item(0).childNodes.length);
        editor.setSelection(range);
    }

    describe.skip('removeAllFormatting', function () {
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

    describe('makePreformatted', function () {
        it('adds a PRE element around text on same line', function () {
            var startHTML = '<div>one two three four five</div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            editor.moveCursorToStart();
            editor.makePreformatted();
            // return expect(editor, 'to contain HTML', [
            //     {
            //         name: 'pre',
            //         children: [
            //             'one two three four five'
            //         ]
            //     }
            // ]);
            // expect(editor, 'to contain HTML', '<pre>one two three four five</pre><div></div>');
            // console.log(editor.getDocument().body);debugger;
            return expect(editor.getDocument().body, 'to satisfy', '<pre>ONE TWO THREE FOUR FIVE</pre><div></div>');
        });

        it('adds an empty PRE element', function () {
            var startHTML = '<div></div><div>one two three four five</div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            editor.moveCursorToStart();
            editor.makePreformatted();
            expect(editor, 'to contain HTML', '<pre>\n</pre><div>one two three four five</div>');
        });

        it('expands existing PRE tags to encompass selection', function () {
            var startHTML = '<div></div><pre>one two three four five</pre><div></div>';
            editor.setHTML(startHTML);
            expect(editor, 'to contain HTML', startHTML);
            selectAll(editor);
            editor.makePreformatted();
            expect(editor, 'to contain HTML', '<pre>\none two three four five\n</pre>');
        });

    });

    afterEach(function () {
        editor = null;
        var iframe = document.getElementById('testFrame');
        iframe.src = 'blank.html';
    });
});
})();
