/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for Rednews
mailto:wtiger@mail.ru
*/
function onChangeType(){

	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''},
		currency: {visible: ''},
		in_language: {visible: ''},
		in_currency: {visible: ''}
	});

	if(props.source.value == 2){
		AnyBalance.setPreferenceProperties({
			currency: {visible: false},
			in_language: {visible: true},
			in_currency: {visible: true}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			currency: {visible: true},
			in_language: {visible: false},
			in_currency: {visible: false}
		});
	};
}

function main(){
	AnyBalance.addCallback('change#source', onChangeType);
	onChangeType();
}
