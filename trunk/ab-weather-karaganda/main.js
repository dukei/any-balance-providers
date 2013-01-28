function getParam(result, info, namein, nameout){
        if(AnyBalance.isAvailable(nameout)){
			var matches, regexp = new RegExp('<TD ALIGN=CENTER class=izmname>'+namein+':<BR><FONT SIZE=5>(-*\\d*\\.?\\d+)</FONT>', 'i');
			if(matches = info.match(regexp)){
				result[nameout] = parseFloat(matches[1]);
			}
		}
}
       
function main(){
        AnyBalance.trace('Connecting to www.meteoclub.kz/index.php...');
       
        var info = AnyBalance.requestGet('http://meteoclub.kz/index.php');
       
        var result = {success: true};

        getParam(result, info, 'Температура', 'Temp');
        getParam(result, info, 'Атмосферное давление', 'Press');
        getParam(result, info, 'Скорость ветра', 'Wind');
       
        AnyBalance.setResult(result);
}
