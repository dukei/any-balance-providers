
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html, application/xhtml+xml, image/jxr, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en-US;q=0.7,en;q=0.3',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
};

	const iiud_part=(len,base=16)=>Math.floor((1 + Math.random()) * base**len).toString(base).substring(1);	
	//const=generateUUID=(mask='4',base=16)=>mask.match(/\d+/g).map(m=>iiud_part(m,base)).join('-');
	function generateUUID(mask='4',base=16){
		var mathes=mask.match(/\d+/g)
		var res='';
		for(var i=0;i<mathes.length;i++)
                    res+=iiud_part(mathes[i],base)+'-';

                res=res.substring(0,res.length-1);
                return res;
	}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.turkishairlines.com';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + '/ru-ru/index.html', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var url=getParam(html,null,null,/src="([^"]*)">\s*<\/script>\s*<\/body>\s*<\/html>/);
	var pageID=getParam(html,null,null,/name="PageRequestID"\s+content="([^"]*)"/);
//pageID='3dde724f-92b2-4e11-8eaf-34e774c07e45';
	var html = AnyBalance.requestPost(baseurl + url, {
		"sensor_data": "7a74G7m23Vrp0o5c9265561.7-1,2,-94,-100,Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36,uaend,12147,20030107,ru,Gecko,3,0,0,0,399785,322304,1920,1040,1920,1080,1920,880,1920,,cpen:0,i1:0,dm:0,cwen:0,non:1,opc:0,fc:0,sc:0,wrc:1,isc:0,vib:1,bat:1,x11:0,x12:1,8322,0.412811261206,812415161151.5,0,loc:-1,2,-94,-101,do_en,dm_en,t_en-1,2,-94,-105,-1,2,-94,-102,-1,2,-94,-108,-1,2,-94,-110,-1,2,-94,-117,-1,2,-94,-111,-1,2,-94,-109,-1,2,-94,-114,-1,2,-94,-103,-1,2,-94,-112,https://www.turkishairlines.com/ru-ua/index.html-1,2,-94,-115,1,32,32,0,0,0,0,986,0,1624830322303,57,17381,0,0,2896,0,0,987,0,0,F926876E97859DF8F970574437D3668C~-1~YAAQ1Y5lX48Sbk56AQAAXSZvTwa3uykFAl/3ct/vNgNEC38KINnSGa7Cpg1uoPQiiHgdcsCv1MVg6PdCjr1QeLM+q6/bUmRVoYOlvpFwZOxLjNhKqA35/raeu80TbXxjwfAuj7sg0M5HnzIe7Vvd7LzDGdzryXStK90GD69weJiaklyKeIpfqRiQC05izkl1DYgUDNndtiXgOwGrKDHaNgFrcq/WRuOh+DTmPrppmyuUAvPnvRmOS98PFycdjV3ZhshdX3MFmtHILvFgLCzS/mRkWgAMnxEm/TxNVnzo+mBUfs6IHRl98Lf9pToVviOy5K0RgdQKliCR5rT1q86zOpqBtenM9hubl8SXbA4iQY7C9g2oyTqU6dyUkocyHdqAJOc03JZw0tli/g9P3iQ/S/T2e0vcN+Va9HfV1x+AKE5ereb4wngpvKin9n1nFw==~-1~-1~-1,41758,761,-1850619405,30261693,PiZtE,19390,19,0,-1-1,2,-94,-106,9,1-1,2,-94,-119,580,80,80,100,100,100,80,40,80,20,20,0,20,200,-1,2,-94,-122,0,0,0,0,1,0,0-1,2,-94,-123,-1,2,-94,-124,-1,2,-94,-126,-1,2,-94,-127,10321144241322243122-1,2,-94,-70,-1151536724;1701442152;dis;,7,8;true;true;true;-180;true;24;24;true;false;1-1,2,-94,-80,5567-1,2,-94,-116,4834530-1,2,-94,-118,93176-1,2,-94,-129,ddf68f2157d3c0edf2744f0b57b5e4c63840c2c94b8cc853141f293336e1e305,1,0,Google Inc. (Intel),ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0, D3D11-10.18.10.5129),95f5b71fe531f867faa814bdd4050dd8057206d53ecec1163523560525884870,33-1,2,-94,-121,;62;17;0"
		},g_headers);
	g_headers={
		'page':'https://www.turkishairlines.com/ru-ua/index.html#',
		'accept-language':'ru',
		'requestid':generateUUID('8-4-4-4-12'),
		'pagerequestid':pageID,
		'content-type':'application/json; charset=UTF-8',
		'accept':'*/*',
		'x-requested-with':'XMLHttpRequest',
		'country':'ru',
		'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
		'origin':'https://www.turkishairlines.com',
		'referer':'https://www.turkishairlines.com/ru-ua/index.html',
		'accept-encoding':'gzip, deflate, br'
	}	
	var html = AnyBalance.requestPost(baseurl + '/com.thy.web.online.miles/ms/login/signin', JSON.stringify({
		username: prefs.login,
		loginType: "1",
		password: prefs.password,
		recaptchaInfo: {}
		}),g_headers);
        var json=getJson(html);
	var result = {success: true};
        if (!json.type=='SUCCESS') {
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Ошибка авторизции',false,true);
        }
        g_headers.requestid=generateUUID('8-4-4-4-12');
	var html = AnyBalance.requestGet(baseurl + '/com.thy.web.online.miles/ms/miles/memberprofile?_='+new Date()*1,g_headers);
	var json=getJson(html);
        if (!json.type=='SUCCESS') {
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Ошибка чтения профиля',false,true);
        }

	getParam(json.data.milesProgramInfo.statusMilesLastYear, result, 'miles', null,null, parseBalance);
	getParam(json.data.milesProgramInfo.totalMiles, result, 'total_miles', null,null, parseBalance);
	getParam(json.data.milesProgramInfo.milesSinceEnrolment, result, 'miles_from_enrolment', null,null, parseBalance);
	getParam(json.data.milesProgramInfo.cardName, result, '__tariff');

	AnyBalance.setResult(result);
}
