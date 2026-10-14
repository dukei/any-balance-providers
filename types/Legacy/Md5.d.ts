//определены в модуле crypt/md5
declare function hex_md5(s: string): string;
declare function b64_md5(s: string): string;

export class Md5{
    public static hex_md5(s: string): string {
        return hex_md5(s);
    }
    public static b64_md5(s: string): string {
        return b64_md5(s);
    }
}
