//��� ���:
//��� ��������� ��� ��������� AnyBalance.
//���������� ������� ���� � ��� � ������ ������������.
//���� � ����� http://meteo-nso.ru/pages/9

function main()
{
	AnyBalance.setDefaultCharset('utf-8');

  //AnyBalance.setResult({success: true, mycounter: 'Hello, World!'});
  
  
  // �������� ���������� ����� � ������� ����
  		AnyBalance.trace('Connecting to meteo-nso.ru...');
        var info = AnyBalance.requestGet('http://meteo-nso.ru/pages/9');
        //AnyBalance.trace(info); //�� �������� � ���
        
        // ��� �������� ���������� ���������� �������� ���������
        // � result ����������� ������ ���� ���� success: true
        var result = {success: true};

		var matches; //
		var nameout; //��� ���������, ������� ����� ������� ������ ��������
		var regexp; //������� ��� ��������� ���� ��� ��������
		
		     
		        
		//------------------------------------------------------------------
        //������� ���� � ���
        //------------------------------------------------------------------
		        
		nameout = "OBWL";
//		//�� ����:
//		//������� ���� (��) ��� 0 ������� ��� �����������</span></td>
//		//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">25</p></td>
//		
//				//var regexp = /(������� ���� [^<>]+ ���)/;
//				//��� �� ��������, ������ � ���� ���������� html ����, � ��� regexp -��-�������.
//				//�������
		regexp = /(\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0432\u043e\u0434\u044b [^<>]+ \u041e\u0431\u044c [\u0410-\u044f]+).+\s.+>(\d+)<\/p>/;
 		getRate(result, info, regexp, nameout);      
        
        
        //------------------------------------------------------------------
        //������� ���� � ���
        //------------------------------------------------------------------
        nameout = "VHWL";
//�� ����:
//������� ������� ���� ������������� (��, � ��) � 8 ��� ����</span></td>
//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">585 �� ��� 113.35 � ��</p>
        
        // /([ �-�]+������ ���� ����[\(\),\d �-�]+)/
        regexp = /([ \u0410-\u044f]+\u0440\u043e\u0432\u0435\u043d\u044c \u0432\u043e\u0434\u044b \u0432\u043e\u0434\u043e[\(\),\d \u0410-\u044f]+).+\s.+>(\d+).+<\/p>/;
		getRate(result, info, regexp, nameout); 
        
        
        
               
        
        //------------------------------------------------------------------
        //����������� ���� � ���
        //------------------------------------------------------------------
        nameout = "OBT";
        
//�� ����:
//>�.��� �����������,  t�C</span></td>
//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">8,0</p></td>
//			</tr>
        // /([\. �-�]+ ��� [�-�]+ t.C).+\s.+>([,\d]+)<\/p>/
        //regexp = /([\.\u0410-\u044f]+\u041e\u0431\u044c [,\u0410-\u044f]+ t.C).+\s.+>([.,\d]+)<\/p>/;
        regexp = /([\.\u0410-\u044f]+\u041e\u0431\u044c [,\u0410-\u044f]+ +t.C).+\s.+>([.,\d]+)<\/p>/;
        
        getRate(result, info, regexp, nameout); 
        
        
                //------------------------------------------------------------------
        //����������� ���� � ���
        //------------------------------------------------------------------
        nameout = "VHT";
        
//�� ����:
//������������� �������������, t�C</span></td>
//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">9,3</p></td>        // /([\. �-�]+ ��� [�-�]+ t.C).+\s.+>([,\d]+)<\/p>/
        
        //regexp = /([\.\u0410-\u044f]+\u041e\u0431\u044c [,\u0410-\u044f]+ +t.C).+\s.+>([.,\d]+)<\/p>/;
        // ([�-�] ����[�-�], +t.C).+\s.+>([,\d]+)<\/p>
        regexp = /([\u0410-\u044f]+ \u0432\u043e\u0434\u043e[\u0410-\u044f]+, +t.C).+\s.+>([.,\d]+)<\/p>/;
        
        getRate(result, info, regexp, nameout); 
        
        
        
        

        //���������� ���������
        AnyBalance.setResult(result);
        
}






function getRate(result, info, regexp, nameout)
{
		AnyBalance.trace('------------- Obtain ' + nameout + ' ----------------');
				
		AnyBalance.trace('RegExp: ' + regexp);
		if(matches = info.match(regexp))
        {
        	//��� ������� �� � ���
        	matches.forEach(function(item, i, arr) 
        						{
        							AnyBalance.trace('RegExp match ' + i + ': ' + item);
								}
							);
        	if(AnyBalance.isAvailable(nameout))
            {
            	result[nameout] = parseFloat(matches[2].replace(',','.'));
                AnyBalance.trace('Put ' + result[nameout] + ' to ' + nameout);
            }
        }else
        {
        	AnyBalance.trace('Error: RegExp not match');
        	result[nameout] = 0;
        }
}



