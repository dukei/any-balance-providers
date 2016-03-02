//Сэмулируем нужные переменные из браузерного окружения
(function(global){
	global.navigator = {
		appName: 'Netscape',
		appVersion: "5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36"
	};
	global.window = {};
})(this);