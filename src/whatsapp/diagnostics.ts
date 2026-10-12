// Only controlled classifications leave the backend. Raw transport errors can contain credentials.
export function connectionDiagnostic(error:unknown):string {
 const message=typeof error==='string'?error:error instanceof Error?error.message:'';
 const candidate=error&&typeof error==='object'?error as {code?:unknown;cause?:{code?:unknown};output?:{statusCode?:unknown}}:{};
 const code=candidate.code??candidate.cause?.code;
 if(code==='EACCES'||code==='EPERM'||/permission denied/i.test(message))return 'STORAGE_PERMISSION: sem permissão para gravar a sessão no volume.';
 if(code==='ENOSPC')return 'STORAGE_FULL: volume sem espaço disponível.';
 if(code==='ENOTFOUND'||code==='EAI_AGAIN'||/getaddrinfo|ENOTFOUND|EAI_AGAIN/.test(message))return 'DNS_FAILURE: falha ao resolver o destino do WhatsApp.';
 if(code==='ECONNREFUSED'||code==='ECONNRESET'||/ECONNREFUSED|ECONNRESET/.test(message))return 'NETWORK_FAILURE: conexão com o destino recusada ou interrompida.';
 if(/timeout|timed out|ETIMEDOUT/i.test(message)||code==='ETIMEDOUT')return 'CONNECTION_TIMEOUT: não foi possível gerar QR/pairing dentro de 90 segundos.';
 if(/certificate|TLS|SSL/i.test(message))return 'TLS_FAILURE: falha na conexão TLS com o destino.';
 if(/logged_out|401/.test(message)||candidate.output?.statusCode===401)return 'SESSION_LOGGED_OUT: sessão expirada; use Logout WhatsApp e conecte novamente.';
 if(/restart_required|515/.test(message))return 'RESTART_REQUIRED: o WhatsApp solicitou reinicialização da conexão.';
 if(/connection_closed|connection closed|428|408/.test(message))return 'CONNECTION_CLOSED: WhatsApp encerrou a conexão antes da autenticação.';
 if(/crypto|subtle|webcrypto/i.test(message))return 'CRYPTO_FAILURE: runtime incompatível com a criptografia do transporte.';
 if(/version|fetch failed/i.test(message))return 'VERSION_FETCH_FAILURE: falha ao consultar a versão do protocolo remoto.';
 return 'BERRY_CONNECTION_FAILURE: falha de transporte não classificada; verifique a versão Berry e tente QR após reiniciar o serviço.';
}
