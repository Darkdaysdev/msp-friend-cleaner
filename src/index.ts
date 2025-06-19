import fetch from 'node-fetch';
import readline from 'readline';
import chalk from 'chalk';
import figlet from 'figlet';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function promptAsync(soru: string): Promise<string> {
    return new Promise(resolve => {
        rl.question(chalk.cyan(soru), cevap => resolve(cevap));
    });
}

let YOUR_PROFILE_ID: string | null = null;
let AUTH_TOKEN: string | null = null;

async function setup(): Promise<void> {
    console.log(
        chalk.hex('#ff5500')(
            figlet.textSync('DARKDAYS', { horizontalLayout: 'default' })
        )
    );
    console.log(chalk.yellow('MovieStarPlanet Arkadaş Temizleyici - DarkdaysDev Tarafından Yapılmıştır\n'));
    YOUR_PROFILE_ID = await promptAsync('MovieStarPlanet Profil ID (TR|31099520): ');
    AUTH_TOKEN = await promptAsync('Auth Token (Bearer ile başlayacak): ');
    rl.close();
}

const DELAY_BETWEEN_REQUESTS = 1000;
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type FriendId = string;

type Endpoint = {
    url: string;
    method: 'GET' | 'POST';
    body?: string;
};

async function getFriendsList(): Promise<FriendId[]> {
    console.log(chalk.blue('🔄 Arkadaş listesi alınıyor...'));
    if (!YOUR_PROFILE_ID || !AUTH_TOKEN) return [];
    const endpoints: Endpoint[] = [
        {
            url: 'https://eu.mspapis.com/experience/v1/experience/batch',
            method: 'POST',
            body: JSON.stringify([
                {
                    profileId: YOUR_PROFILE_ID,
                    gameId: 'j68d'
                }
            ])
        },
        {
            url: `https://eu.mspapis.com/profilerelationships/v2/profiles/${encodeURIComponent(YOUR_PROFILE_ID)}/relationships`,
            method: 'GET'
        },
        {
            url: `https://eu.mspapis.com/profilerelationships/v2/profiles/${encodeURIComponent(YOUR_PROFILE_ID)}/friends`,
            method: 'GET'
        },
        {
            url: `https://eu.mspapis.com/social/v1/profiles/${encodeURIComponent(YOUR_PROFILE_ID)}/friends`,
            method: 'GET'
        }
    ];
    for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        console.log(chalk.cyanBright(`🔍 Endpoint ${i + 1} deneniyor: ${endpoint.url}`));
        try {
            const requestOptions: any = {
                method: endpoint.method,
                headers: {
                    'Authorization': AUTH_TOKEN,
                    'Accept': '*/*',
                    'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3',
                    'Origin': 'https://moviestarplanet2.com',
                    'Referer': 'https://moviestarplanet2.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'Priority': 'u=4',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            };
            if (endpoint.method === 'POST') {
                requestOptions.headers['Content-Type'] = 'application/json';
                requestOptions.body = endpoint.body;
            }
            const response = await fetch(endpoint.url, requestOptions);
            if (response.ok) {
                const data = await response.json();
                console.log(chalk.greenBright(`✅ Endpoint ${i + 1} başarılı!`));
                let friendIds: FriendId[] = [];
                if (Array.isArray(data as any)) {
                    friendIds = (data as any).map((friend: any) => friend.experience?.profileId || friend.profileId || friend.id);
                } else if ((data as any).relationships && Array.isArray((data as any).relationships)) {
                    friendIds = (data as any).relationships.map((friend: any) => friend.profileId || friend.id);
                } else if ((data as any).friends && Array.isArray((data as any).friends)) {
                    friendIds = (data as any).friends.map((friend: any) => friend.profileId || friend.id);
                } else if ((data as any).data && Array.isArray((data as any).data)) {
                    friendIds = (data as any).data.map((friend: any) => friend.profileId || friend.id);
                } else {
                    console.log(chalk.yellowBright('⚠️ Beklenmeyen API yanıt formatı:'), data);
                    continue;
                }
                friendIds = friendIds.filter(id => id && id !== YOUR_PROFILE_ID);
                if (friendIds.length > 0) {
                    console.log(chalk.green(`✅ Toplam ${friendIds.length} arkadaş bulundu.`));
                    return friendIds;
                } else {
                    console.log(chalk.yellow('⚠️ Bu endpoint\'te arkadaş bulunamadı.'));
                }
            } else {
                console.log(chalk.redBright(`❌ Endpoint ${i + 1} başarısız: ${response.status} ${response.statusText}`));
            }
        } catch (error: any) {
            console.log(chalk.bgRed.white(`❌ Endpoint ${i + 1} hatası:`), error.message);
        }
        if (i < endpoints.length - 1) {
            await sleep(500);
        }
    }
    console.error(chalk.redBright('❌ Hiçbir endpoint\'ten arkadaş listesi alınamadı!'));
    return [];
}

async function deleteFriend(friendId: FriendId, retryCount = 0): Promise<boolean> {
    if (!YOUR_PROFILE_ID || !AUTH_TOKEN) return false;
    try {
        const encodedId = encodeURIComponent(friendId);
        const url = `https://eu.mspapis.com/profilerelationships/v2/profiles/${encodeURIComponent(YOUR_PROFILE_ID)}/relationships/${encodedId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': AUTH_TOKEN,
                'Accept': '*/*',
                'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3',
                'Origin': 'https://moviestarplanet2.com',
                'Referer': 'https://moviestarplanet2.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'Priority': 'u=4',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });
        if (response.ok) {
            console.log(chalk.greenBright(`✅ Silindi: ${friendId}`));
            return true;
        } else {
            const errorText = await response.text();
            console.log(chalk.red(`⚠️ Silinemedi: ${friendId} → ${response.status} ${response.statusText}`));
            if ((response.status === 429 || response.status >= 500) && retryCount < MAX_RETRIES) {
                console.log(chalk.yellow(`🔄 ${friendId} için tekrar deneniyor... (${retryCount + 1}/${MAX_RETRIES})`));
                await sleep(DELAY_BETWEEN_REQUESTS * 2);
                return deleteFriend(friendId, retryCount + 1);
            }
            return false;
        }
    } catch (error: any) {
        console.error(chalk.bgRed.white(`❌ ${friendId} silinirken hata:`), error.message);
        if (retryCount < MAX_RETRIES) {
            console.log(chalk.yellow(`🔄 ${friendId} için tekrar deneniyor... (${retryCount + 1}/${MAX_RETRIES})`));
            await sleep(DELAY_BETWEEN_REQUESTS);
            return deleteFriend(friendId, retryCount + 1);
        }
        return false;
    }
}

async function main(): Promise<void> {
    await setup();
    console.log(chalk.magenta('📢 Arkadaş silme işlemi başlatılıyor...'));
    console.log(chalk.blueBright('👤 Profil ID: ') + chalk.whiteBright(YOUR_PROFILE_ID));
    console.log(chalk.yellowBright('🔄 Bu işlem arkadaş listesi bitene kadar sürekli tekrarlanacak!'));
    console.log(chalk.gray('='.repeat(50)));
    let totalSuccessCount = 0;
    let totalFailCount = 0;
    let roundCount = 0;
    const startTime = Date.now();
    while (true) {
        roundCount++;
        console.log(chalk.bgBlueBright.black(`\n🔄 TUR ${roundCount} BAŞLIYOR...`));
        console.log(chalk.gray('='.repeat(30)));
        const friendIds = await getFriendsList();
        if (friendIds.length === 0) {
            console.log(chalk.greenBright('✅ Tüm arkadaşlar silindi! İşlem tamamlandı.'));
            break;
        }
        console.log(chalk.yellowBright(`📋 Bu turda ${friendIds.length} arkadaş silinecek.`));
        let roundSuccessCount = 0;
        let roundFailCount = 0;
        for (let i = 0; i < friendIds.length; i++) {
            const friendId = friendIds[i];
            console.log(chalk.cyanBright(`\n📝 İşleniyor: ${i + 1}/${friendIds.length} - ${friendId}`));
            const success = await deleteFriend(friendId);
            if (success) {
                roundSuccessCount++;
                totalSuccessCount++;
            } else {
                roundFailCount++;
                totalFailCount++;
            }
            if (i < friendIds.length - 1) {
                console.log(chalk.gray(`⏳ ${DELAY_BETWEEN_REQUESTS}ms bekleniyor...`));
                await sleep(DELAY_BETWEEN_REQUESTS);
            }
        }
        const roundEndTime = Date.now();
        const roundDuration = Math.round((roundEndTime - startTime) / 1000);
        console.log(chalk.bgMagentaBright.white(`\n📊 TUR ${roundCount} SONUÇLARI:`));
        console.log(chalk.green(`   ✅ Bu turda başarılı: ${roundSuccessCount}`));
        console.log(chalk.red(`   ❌ Bu turda başarısız: ${roundFailCount}`));
        console.log(chalk.blue(`   📈 Bu tur başarı oranı: ${Math.round((roundSuccessCount / friendIds.length) * 100)}%`));
        console.log(chalk.yellow(`   ⏱️ Toplam süre: ${roundDuration} saniye`));
        console.log(chalk.gray(`\n⏳ Bir sonraki tur için 3 saniye bekleniyor...`));
        await sleep(3000);
    }
    const endTime = Date.now();
    const totalDuration = Math.round((endTime - startTime) / 1000);
    console.log('\n' + chalk.gray('='.repeat(50)));
    console.log(chalk.bgGreen.black('🎉 TÜM İŞLEMLER TAMAMLANDI!'));
    console.log(chalk.bgBlue.white('📊 GENEL SONUÇLAR:'));
    console.log(chalk.cyan(`   🔄 Toplam tur sayısı: ${roundCount}`));
    console.log(chalk.green(`   ✅ Toplam başarılı: ${totalSuccessCount}`));
    console.log(chalk.red(`   ❌ Toplam başarısız: ${totalFailCount}`));
    console.log(chalk.yellow(`   ⏱️ Toplam süre: ${totalDuration} saniye (${Math.round(totalDuration / 60)} dakika)`));
    console.log(chalk.blue(`   📈 Genel başarı oranı: ${Math.round((totalSuccessCount / (totalSuccessCount + totalFailCount)) * 100)}%`));
    console.log(chalk.gray('='.repeat(50)));
}

main().catch(error => {
    console.error(chalk.bgRed.white('💥 Kritik hata:'), error);
    process.exit(1);
}); 