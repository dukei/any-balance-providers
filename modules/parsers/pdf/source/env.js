//////replacing HTML5 canvas with PDFCanvas (in-memory canvas)
function createScratchCanvas(width, height) { return new PDFCanvas({}, width, height); }

var PDFJS = {disableWorker: true};
var _console = {
	log: function(o){
		if(typeof AnyBalance != 'undefined')
			AnyBalance.trace('' + o);
	}
};
var globalScope = {console: _console, PDFJS: PDFJS};

(function(global){
	var m_timeouts = [], m_baseTime = 0;

	function setTimeout(callback, delay){
		m_timeouts.push({func: callback, delay: m_baseTime + delay});
		return m_timeouts.length;
	}

	function clearTimeout(id){
		m_timeouts[id-1].delay = -1;
	}

	function processTimeouts(global){
		do{
			var minTime = 200000000;
			var minIdx = -1;
			for(var i=0; i<m_timeouts.length; ++i){
				var t = m_timeouts[i];
				if(t.delay < 0)
					continue;
				if(t.delay < minTime)
					minIdx = i, minTime = t.delay;
			}
			if(minIdx < 0)
				return; //Закончились таймауты
			var t = m_timeouts[minIdx];
			if(m_baseTime < t.delay)
				AnyBalance.sleep(t - m_baseTime);
			m_baseTime = t.delay;
			if(typeof(t.func) == 'string')
				AnyBalance.safeEval(t.func);
			else
				t.func.call();
			t.delay = -1;
		}while(true);
	}

	global.clearABTimeout = clearTimeout;
	global.setABTimeout = setTimeout;
	global.processABTimeouts = processTimeouts;
})(this);