
/*****
 * A no frills tooltip implementation.
 *****/

(function($) {

  var nvtooltip = window.nvtooltip = {};

  nvtooltip.show = function(pos, content, gravity, dist) {
    var container = $('<div class="nvtooltip">');

    gravity = gravity || 's';
    dist = dist || 20;

    container
      .html(content)
      .css({left: -1000, top: -1000, opacity: 0})
      .appendTo('body'); //append the container out of view so we can get measurements

    var height = container.height() + parseInt(container.css('padding-top'))  + parseInt(container.css('padding-bottom')),
        width = container.width() + parseInt(container.css('padding-left'))  + parseInt(container.css('padding-right')),
        windowWidth = $(window).width(),
        windowHeight = $(window).height(),
        scrollTop = $('body').scrollTop(),
        scrollLeft = $('body').scrollLeft(),
        left, top;


    switch (gravity) {
      case 'e':
        left = pos[0] - width - dist;
        top = pos[1] - (height / 2);
        if (left < scrollLeft) left = pos[0] + dist;
        if (top < scrollTop) top = scrollTop + 5;
        if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
        break;
      case 'w':
        left = pos[0] + dist;
        top = pos[1] - (height / 2);
        if (left + width > windowWidth) left = pos[0] - width - dist;
        if (top < scrollTop) top = scrollTop + 5;
        if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
        break;
      case 'n':
        left = pos[0] - (width / 2);
        top = pos[1] + dist;
        if (left < scrollLeft) left = scrollLeft + 5;
        if (left + width > windowWidth) left = windowWidth - width - 5;
        if (top + height > scrollTop + windowHeight) top = pos[1] - height - dist;
        break;
      case 's':
        left = pos[0] - (width / 2);
        top = pos[1] - height - dist;
        if (left < scrollLeft) left = scrollLeft + 5;
        if (left + width > windowWidth) left = windowWidth - width - 5;
        if (scrollTop > top) top = pos[1] + 20;
        break;
    }


    container
        .css({
          left: left,
          top: top,
          opacity: 1
        });

    return container;
  };

  nvtooltip.cleanup = function() {
    var tooltips = $('.nvtooltip');

    tooltips.css({
        'transition-delay': '0 !important',
        '-moz-transition-delay': '0 !important',
        '-webkit-transition-delay': '0 !important'
    });

    tooltips.css('opacity',0);

    setTimeout(function() {
      tooltips.remove()
    }, 500);
  };

})(jQuery);
