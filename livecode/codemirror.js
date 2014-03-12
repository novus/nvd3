

var preMarkup = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/css/nv.d3.css"><script type="text/javascript" src="/assets/lib/d3.v2.js"></script><script type="text/javascript" src="/assets/lib/fisheye.js"></script><script type="text/javascript" src="/assets/js/nv.d3.js"></script></head><body>';
var midMarkup = '<script>var data = ';
var midMarkup2 = ';';
var postMarkup = '</script></body></html>';


var delay;

var editorMarkup = CodeMirror.fromTextArea(document.getElementById('codeMarkup'), {
  mode: 'text/html',
  tabMode: 'indent',
  theme: 'eclipse',
  lineNumbers: true,
  lineWrapping: true,
  keyMap: 'default',
  onChange: function() {
    clearTimeout(delay);
    delay = setTimeout(updatePreview, 300);
  }
});

var editorData = CodeMirror.fromTextArea(document.getElementById('codeData'), {
  mode: 'javascript',
  tabMode: 'indent',
  theme: 'eclipse',
  lineNumbers: true,
  lineWrapping: true,
  keyMap: 'default',
  onChange: function() {
    clearTimeout(delay);
    delay = setTimeout(updatePreview, 300);
  }
});

var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
  mode: 'javascript',
  tabMode: 'indent',
  theme: 'eclipse',
  lineNumbers: true,
  lineWrapping: true,
  keyMap: 'default',
  onChange: function() {
    clearTimeout(delay);
    delay = setTimeout(updatePreview, 300);
  }
});


loadChart('line');


function loadChart(chartName) {
  d3.text(chartName + 'Markup.html', function(text) {
    d3.select('#chartMarkup').classed('active', true);
    editorMarkup.setValue(text);
    //if (Inlet) Inlet(editorMarkup);
    //d3.selectAll('#codeTabsContent .tab-pane.active').classed('active',false);
    //d3.select(d3.select('#codeTabs .active a').attr('href'))
        //.classed('active', false);
    d3.select('#chartMarkup').classed('active',
      d3.select('#codeTabs .active a').attr('href').indexOf('#chartMarkup') !== -1)

  })

  d3.text(chartName + 'Data.json', function(text) {
    d3.select('#chartData').classed('active', true);
    editorData.setValue(text);
    //if (Inlet) Inlet(editorData);
    //d3.selectAll('#codeTabsContent .tab-pane.active').classed('active',false);
    //d3.select(d3.select('#codeTabs .active a').attr('href'))
        //.classed('active', true);
    d3.select('#chartData').classed('active',
      d3.select('#codeTabs .active a').attr('href').indexOf('#chartData') !== -1)
  })

  d3.text(chartName + 'Chart.js', function(text) {
    d3.select('#chartCode').classed('active', true);
    editor.setValue(text);
    //if (Inlet) Inlet(editor);
    //d3.selectAll('#codeTabsContent .tab-pane.active').classed('active',false);
    //d3.select(d3.select('#codeTabs .active a').attr('href'))
        //.classed('active', true)
    d3.select('#chartCode').classed('active',
      d3.select('#codeTabs .active a').attr('href').indexOf('#chartCode') !== -1)
  })
}


$('#loadChart li > a').on('click', function(e) {
  $('#chartTitle').text($(this).text())
  loadChart($(this).data('chart'))
  e.preventDefault();
});

$('.thumbnails li > a').on('click', function(e) {
  $('#chartTitle').text($(this).data('charttitle'));
  loadChart($(this).data('chart'))
  //e.preventDefault();
});


function updatePreview() {
  var previewFrame = document.getElementById('preview');
  var preview =  previewFrame.contentDocument ||  previewFrame.contentWindow.document;
  preview.open();
  preview.write(preMarkup + editorMarkup.getValue() + midMarkup + editorData.getValue() + midMarkup2 + editor.getValue() + postMarkup);
  preview.close();
}
setTimeout(updatePreview, 300);


function setKeymap(mode) {
  editor.setOption('keyMap', mode);
  editorData.setOption('keyMap', mode);
  editorMarkup.setOption('keyMap', mode);
}

d3.select('#keymap-default').on('click', function() { setKeymap('default') });
d3.select('#keymap-vim').on('click', function() { setKeymap('vim') });
d3.select('#keymap-emacs').on('click', function() { setKeymap('emacs') });


/*
resizeEditor();
nv.utils.windowResize(resizeEditor);

function resizeEditor() {
  var size = nv.utils.windowSize();

  var preview = d3.select('#previewWrap');
  var code = d3.select('#codeWrap');

  preview
      .style('width', size.width * 1 / 2 + 'px')
      .style('height', size.height - 40 + 'px')

  code
      .style('height', size.height - 40 + 'px')
      .style('width', size.width * 1 / 2 - 20 + 'px')

}
*/


$(document).ready(function() {

  setTimeout(function() {
    // fix sub nav on scroll
    var $win = $(window)
      , $nav = $('#codemirrorNav')
      , $wrap = $('#codemirrorWrap')
      , $preview = $('#preview')
      , navTop = $('#codemirrorNav').length && $('#codemirrorNav').offset().top - 40
      , isFixed = 0

    processScroll()

    /*
    // hack sad times - holdover until rewrite for 2.1
    $nav.on('click', function () {
      if (!isFixed) setTimeout(function () {  $win.scrollTop($win.scrollTop() - 47) }, 10)
    })
   */

    $win.on('scroll', processScroll)

    function processScroll() {
      var i, scrollTop = $win.scrollTop()
      if (scrollTop >= navTop && !isFixed) {
        isFixed = 1
        $nav.addClass('subnav-fixed')
        $wrap.addClass('wrap-fixed')
        $preview.addClass('preview-fixed')
      } else if (scrollTop <= navTop && isFixed) {
        isFixed = 0
        $nav.removeClass('subnav-fixed')
        $wrap.removeClass('wrap-fixed')
        $preview.removeClass('preview-fixed')
      }
    }
  }, 1000);


  fixCodemirrorHeight();
  $(window).resize(fixCodemirrorHeight);

  function fixCodemirrorHeight() {
    var h = $(window).height() - 120;

    $('#codemirrorWrap').css('min-height', h + 'px');
  }

});
