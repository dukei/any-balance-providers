function main() {
  AnyBalance.setDefaultCharset("utf-8");
  var prefs = AnyBalance.getPreferences();
  var url="http://pskovline.ru/utm5/";
  var info = AnyBalance.requestPost(url, {login: prefs.login, password: prefs.password});

  var result = {success: true}, matches;

        if(info.match(/\'utm-table\'.*?>/i)){
                if(matches = info.match(/\'utm-cell\'.*?>(.*?)</img)){

		var i=0; while(x=matches[i]) {matches[i]=x.match(/>(.*?)</i)[1]; i++;}

                        var login, ballance, number, credit, work;

                        AnyBalance.setResult({success:true, login:matches[1], ballance:matches[5], number:matches[3], credit:matches[7], work:matches[15]});
                }
	
        }
        
        if(!AnyBalance.isSetResultCalled())
                throw new AnyBalance.Error("Error");

//  AnyBalance.setResult({success: true, login: login, ballance: ballance, number: number, credit: credit, work: work});
}
