# IB Presentation Agent – Frontend

Interface web do agente de apresentações em estilo Investment Banking.  
Envia o prompt e arquivos para o webhook do N8N e permite baixar o .pptx gerado.

## Publicar no GitHub Pages

### 1. Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new).
2. **Repository name:** por exemplo `ib-presentation-agent` (ou o nome que preferir).
3. Deixe **Public**.
4. **Não** marque "Add a README" (a pasta já tem os arquivos).
5. Clique em **Create repository**.

### 2. Enviar os arquivos

No PowerShell (ou terminal), na pasta do seu projeto:

```powershell
cd "c:\Users\pedro\OneDrive\Documentos\estudos\cursor\IB automation\frontend-for-github"

git init
git add index.html style.css app.js README.md
git commit -m "Frontend IB Presentation Agent"

git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ib-presentation-agent.git
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu usuário do GitHub e `ib-presentation-agent` pelo nome do repositório se for diferente.

### 3. Ativar o GitHub Pages

1. No repositório no GitHub, vá em **Settings**.
2. No menu lateral, em **Code and automation**, clique em **Pages**.
3. Em **Source**, escolha **Deploy from a branch**.
4. Em **Branch**, selecione **main** e pasta **/ (root)**.
5. Clique em **Save**.

Em alguns minutos o site ficará disponível em:

**https://SEU_USUARIO.github.io/ib-presentation-agent/**

(ou o nome do repositório que você usou.)

### 4. Conferir

Abra essa URL no navegador. O frontend já está configurado para chamar:

`https://ggservices.app.n8n.cloud/webhook/generate-presentation`

Certifique-se de que o workflow **IB Presentation Agent** está **ativo** no N8N Cloud para o webhook responder.

---

Para alterar a URL do webhook no futuro, edite a variável `webhookUrl` no arquivo `app.js`.
