# Nosso amor

Site e app Android para celebrar a história de vocês. O código do site fica em `web/`; o comando de preparação monta uma cópia pronta para publicação em `www/`. Quem ainda não tem uma sessão entra primeiro pela tela de login em `web/pages/login.html`. As páginas colaborativas precisam de internet e de uma sessão autenticada no Supabase; no APK, elas usam o mesmo projeto e sincronizam com o site.

## Organização do repositório

- `web/`: páginas, estilos, imagens, áudio, configuração do Supabase e service worker do site.
- `web/assets/images/icon_appandsite.png`: ícone compartilhado pelo cabeçalho, site instalado e app Android.
- `scripts/`: fontes JavaScript e scripts de preparação/build.
- `supabase/`: SQL de configuração do banco, políticas e armazenamento.
- `web/pages/espaco.html`: entrada para as páginas compartilhadas do casal.
- `android/`: projeto nativo Android gerado pelo Capacitor.
- `releases/`: APK de depuração gerado para instalação manual.
- `www/`: saída gerada por `npm run prepare:web`; não edite os arquivos diretamente.

## Gerar o APK no Windows

Instale o Android Studio 2025.2.1 ou mais recente e, no SDK Manager, instale o Android SDK Platform 36 e o Android SDK Build-Tools. Aceite as licenças do Android SDK no próprio Android Studio. O Android Studio fornece o JDK adequado. Depois, abra um terminal nesta pasta e execute:

```powershell
npm install
npm run android:add
npm run android:apk
```

O APK de depuração será copiado para `releases/Nosso-amor.apk` (o build intermediário também fica em `android/app/build/outputs/apk/debug/app-debug.apk`).

Requisitos do build: Node.js 22 ou mais recente e Android Studio com o Android SDK. O Gradle Wrapper baixa a versão necessária no primeiro build. Para abrir o projeto no Android Studio, use `npm run android:open`.

## Instalar como app pelo navegador

Hospede a pasta em um endereço HTTPS e abra no Chrome do Android. Use **Instalar app** quando aparecer. O modo offline fica disponível depois que o app carrega uma vez. No APK nativo, o botão de lembrete agenda uma notificação mensal local; no navegador, o lembrete só pode ser exibido quando o app é aberto no dia.

## Conversa e fotos compartilhadas entre dois celulares

As interações privadas precisam de internet, HTTPS e de um projeto Supabase; publicar apenas os arquivos no GitHub Pages não cria armazenamento nem sincronização. O site continua funcionando sem configurar essa integração, mas o chat e os uploads ficam desativados até a configuração ser concluída.

**Importante:** o login nas páginas estático é uma barreira de navegação, não transforma o conteúdo do GitHub Pages em privado. Arquivos que já estão no repositório (incluindo fotos) podem ser acessados diretamente por qualquer pessoa. A segurança real dos recadinhos e das novas fotos vem do Supabase e das regras RLS/bucket privado; não envie fotos que devam permanecer secretas para `web/assets/images`.

1. Crie um projeto no Supabase e abra **Authentication → Users → Add user**. Crie as duas contas usando os e-mails internos `kahique@meu-amor.invalid` e `lalavs@meu-amor.invalid`, com senhas novas e fortes, e marque cada conta como confirmada. O domínio `.invalid` é intencional: não recebe e-mails. Nunca reutilize uma senha compartilhada em conversa.
2. Desative o cadastro público em **Authentication → Settings / Sign-in**. As contas do casal devem ser criadas manualmente no painel.
3. No **SQL Editor**, execute todo o conteúdo de [`supabase/setup.sql`](./supabase/setup.sql). Ele cria as tabelas e políticas, inclui as contas existentes em `couple_members` com os nomes `kahique` e `lalavs`, além de criar a função segura que procura o e-mail da conta pelo nome de usuário. Se você já executou esse SQL antes de criar as contas, execute-o novamente agora.
4. A tela consulta o nome de usuário no Supabase e envia o e-mail encontrado junto da senha para o Supabase Auth. **As senhas nunca são armazenadas nessa tabela**: o Auth mantém e verifica as senhas com segurança.
5. No Supabase, abra **Project Settings → API Keys** e use somente o **Project URL** e a chave pública **Publishable/anon** em [`web/assets/js/couple-config.js`](./web/assets/js/couple-config.js). Nunca use `service_role`.
6. Gere os arquivos web com `npm run prepare:web` e publique o conteúdo da pasta `www` no GitHub Pages. O workflow em `.github/workflows/pages.yml` também publica o site a cada atualização na branch `main`.

O site mostra uma tela de login antes das páginas e mantém a sessão em cada celular. A página **conversa** oferece um chat privado em tempo real, com envio de fotos e gravações de voz de até 10 MB, além do modo noturno compartilhado com o restante do site. A página **momentos** permite enviar fotos JPG, PNG ou WebP de até 10 MB usando um seletor com prévia do nome; cada pessoa pode remover as próprias fotos pelo botão exibido no álbum. Se o SQL já foi executado anteriormente, execute `supabase/setup.sql` novamente para habilitar anexos e gravações de voz. Não publique a chave `service_role` nem remova as políticas de segurança do SQL.

O **nosso cantinho** reúne dez espaços privados: conversa, álbum, linha do tempo, cartinhas compartilhadas, diário a dois, planos com contagem regressiva, lista de desejos, mural de recadinhos, perguntas com respostas comparadas e calendário. Para ativar as novas páginas, execute novamente o arquivo completo `supabase/setup.sql` no SQL Editor do mesmo projeto Supabase, gere `www` com `npm run prepare:web` e publique essa pasta. Depois, `npm run android:apk` sincroniza as páginas com o APK. A atualização do esquema não é executada pelo app; isso mantém as credenciais administrativas fora do site e do APK.
