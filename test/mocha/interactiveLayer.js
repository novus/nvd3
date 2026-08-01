describe('NVD3 interactive guideline', function () {
    'use strict';

    var svg, guideline;

    function dispatchTouch(type, touches, changedTouches) {
        var event = document.createEvent('Event');
        event.initEvent(type, true, true);
        Object.defineProperty(event, 'touches', { value: touches });
        Object.defineProperty(event, 'changedTouches', { value: changedTouches || touches });
        svg.dispatchEvent(event);
    }

    beforeEach(function () {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.getBoundingClientRect = function () {
            return { left: 10, top: 20 };
        };
        document.body.appendChild(svg);

        guideline = nv.interactiveGuideline()
            .width(200)
            .height(100)
            .margin({ left: 5, top: 5 })
            .xScale(d3.scale.linear().domain([0, 200]).range([0, 200]))
            .svgContainer(d3.select(svg));

        d3.select(svg).datum([]).call(guideline);
    });

    afterEach(function () {
        document.body.removeChild(svg);
        d3.selectAll('.nvtooltip').remove();
    });

    it('uses the active touch coordinates', function () {
        var interaction;
        guideline.dispatch.on('elementMousemove.test', function (event) {
            interaction = event;
        });

        dispatchTouch('touchmove', [{ clientX: 60, clientY: 50 }]);

        expect(interaction.mouseX).to.equal(45);
        expect(interaction.mouseY).to.equal(25);
        expect(interaction.pointXValue).to.equal(45);
    });

    it('positions the tooltip at the active touch coordinates', function () {
        var position;
        guideline.dispatch.on('elementMousemove.test', function () {
            position = guideline.tooltip.position()();
        });

        dispatchTouch('touchmove', [{ clientX: 60, clientY: 50 }]);

        expect(position.left).to.equal(60);
        expect(position.top).to.equal(50);
    });

    it('hides the tooltip when the touch ends or is cancelled', function () {
        ['touchend', 'touchcancel'].forEach(function (type) {
            guideline.tooltip.hidden(false);
            dispatchTouch(type, [], [{ clientX: 60, clientY: 50 }]);
            expect(guideline.tooltip.hidden()).to.equal(true);
        });
    });
});
