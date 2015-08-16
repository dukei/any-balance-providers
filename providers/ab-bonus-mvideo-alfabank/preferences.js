/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX-Trend
WWW: http://www.fx-trend.com
mailto:wtiger@mail.ru
*/
function onChangeType(){

	var props = AnyBalance.getPreferenceProperties({
		type: {value: ''}
	});

	if(props.type.value == '-1'){
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			password: {visible: true},
			card: {visible: false},
			zip: {visible: false},
			birthday: {visible: false}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login: {visible: false},
			password: {visible: false},
			card: {visible: true},
			zip: {visible: true},
			birthday: {visible: true}
		});
	}

}

function main(){
	AnyBalance.addCallback('change#type', onChangeType);
	onChangeType();
}
