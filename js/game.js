class MountainClimber {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            gameOver: document.getElementById('game-over')
        };
        
        this.setupCanvas();
        this.setupEventListeners();
        this.initGame();
    }

    setupCanvas() {
        this.canvas.width = 1200;
        this.canvas.height = 800;
        
        // Viewport para scrolling vertical
        this.camera = {
            x: 0,
            y: 0,
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('dialog-ok').addEventListener('click', () => this.hideDialog());
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    initGame() {
        this.gameState = {
            player: {
                x: 400,
                y: 700, // Começa na base
                width: 30,
                height: 50,
                velocityX: 0,
                velocityY: 0,
                health: 100,
                maxHealth: 100,
                jumping: false,
                running: false,
                facing: 'right'
            },
            altitude: 0,
            startTime: 0,
            currentTime: 0,
            keys: {
                left: false,
                right: false,
                up: false,
                shift: false
            },
            inventory: {
                rope: 0,
                pickaxe: 1,
                torch: 0
            },
            world: {
                layers: [],
                platforms: [],
                caves: [],
                collectibles: []
            },
            physics: {
                gravity: 0.8,
                jumpPower: -16,
                moveSpeed: 5,
                runSpeed: 8
            },
            gameStarted: false,
            gameCompleted: false
        };

        this.generateWorld();
    }

    generateWorld() {
        const world = this.gameState.world;
        
        // Gerar plataformas para escalada
        this.generatePlatforms();
        
        // Gerar cavernas em diferentes alturas
        this.generateCaves();
        
        // Gerar itens colecionáveis
        this.generateCollectibles();
    }

    generatePlatforms() {
        const platforms = this.gameState.world.platforms;
        
        // Base da montanha
        platforms.push({ x: 0, y: 750, width: 1200, height: 50, type: 'ground' });
        
        // Plataformas de escalada (progressão vertical)
        let currentY = 700;
        for (let i = 0; i < 50; i++) {
            const width = Math.random() * 200 + 100;
            const x = Math.random() * (1000 - width);
            
            platforms.push({
                x: x,
                y: currentY,
                width: width,
                height: 20,
                type: 'rock'
            });
            
            // Subir para próxima plataforma
            currentY -= Math.random() * 80 + 40;
            
            // Adicionar plataformas laterais ocasionais
            if (i % 5 === 0) {
                platforms.push({
                    x: Math.random() > 0.5 ? 0 : 1000 - 150,
                    y: currentY + 100,
                    width: 150,
                    height: 20,
                    type: 'ledge'
                });
            }
        }
        
        // Topo da montanha
        platforms.push({ x: 400, y: -500, width: 400, height: 50, type: 'summit' });
    }

    generateCaves() {
        const caves = this.gameState.world.caves;
        
        // Cavernas em diferentes níveis
        caves.push({
            x: 100,
            y: 500,
            width: 300,
            height: 200,
            type: 'ice',
            explored: false
        });
        
        caves.push({
            x: 800,
            y: 200,
            width: 250,
            height: 180,
            type: 'rock',
            explored: false
        });
        
        caves.push({
            x: 200,
            y: -100,
            width: 350,
            height: 220,
            type: 'crystal',
            explored: false
        });
    }

    generateCollectibles() {
        const collectibles = this.gameState.world.collectibles;
        
        // Cordas em lugares difíceis de alcançar
        for (let i = 0; i < 15; i++) {
            collectibles.push({
                x: Math.random() * 1000 + 100,
                y: -Math.random() * 3000,
                type: 'rope',
                collected: false
            });
        }
        
        // Tochas perto de cavernas
        for (let i = 0; i < 10; i++) {
            collectibles.push({
                x: Math.random() * 1000 + 100,
                y: -Math.random() * 2500,
                type: 'torch',
                collected: false
            });
        }
    }

    startGame() {
        this.screens.start.classList.add('hidden');
        this.screens.game.classList.remove('hidden');
        
        this.gameState.gameStarted = true;
        this.gameState.startTime = Date.now();
        
        this.showDialog("Bem-vindo alpinista! Sua missão é escalar até o topo da montanha. Use as plataformas para subir e explore cavernas para encontrar equipamentos.");
        
        this.gameLoop();
    }

    gameLoop() {
        if (!this.gameState.gameStarted || this.gameState.gameCompleted) return;
        
        this.update();
        this.render();
        this.updateHUD();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.updatePlayer();
        this.updatePhysics();
        this.updateCamera();
        this.checkCollisions();
        this.checkCollectibles();
        this.checkGameCompletion();
    }

    updatePlayer() {
        const player = this.gameState.player;
        const keys = this.gameState.keys;
        const physics = this.gameState.physics;

        // Movimento horizontal
        player.velocityX = 0;
        const speed = keys.shift ? physics.runSpeed : physics.moveSpeed;
        
        if (keys.left) {
            player.velocityX = -speed;
            player.facing = 'left';
        }
        if (keys.right) {
            player.velocityX = speed;
            player.facing = 'right';
        }

        // Pulo
        if (keys.up && !player.jumping) {
            player.velocityY = physics.jumpPower;
            player.jumping = true;
        }

        // Aplicar velocidade
        player.x += player.velocityX;
        player.y += player.velocityY;

        // Aplicar gravidade
        player.velocityY += physics.gravity;

        // Limites horizontais do mundo
        if (player.x < 0) player.x = 0;
        if (player.x > 1200 - player.width) player.x = 1200 - player.width;
    }

    updatePhysics() {
        const player = this.gameState.player;
        const platforms = this.gameState.world.platforms;
        
        // Resetar estado de pulo
        player.jumping = true;
        
        // Verificar colisão com plataformas
        for (const platform of platforms) {
            if (this.checkCollision(player, platform)) {
                // Colisão por baixo (aterrissando)
                if (player.velocityY > 0 && player.y + player.height > platform.y) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.jumping = false;
                    
                    // Se é o topo, completar jogo
                    if (platform.type === 'summit') {
                        this.completeGame();
                    }
                }
            }
        }
    }

    updateCamera() {
        const player = this.gameState.player;
        
        // Seguir jogador verticalmente (scrolling)
        this.camera.y = player.y - this.camera.height * 0.7;
        
        // Atualizar altitude (invertida porque Y diminui ao subir)
        this.gameState.altitude = Math.max(this.gameState.altitude, Math.abs(player.y - 700));
    }

    checkCollisions() {
        // Colisão com cavernas (entrada)
        const player = this.gameState.player;
        const caves = this.gameState.world.caves;
        
        for (const cave of caves) {
            if (!cave.explored && this.checkCollision(player, cave)) {
                cave.explored = true;
                this.showDialog(`Você descobriu uma caverna de ${cave.type}! Encontrou equipamentos úteis.`);
                
                // Recompensa por explorar caverna
                this.gameState.inventory.rope += 2;
                this.gameState.inventory.torch += 1;
            }
        }
    }

    checkCollectibles() {
        const player = this.gameState.player;
        const collectibles = this.gameState.world.collectibles;
        
        for (const item of collectibles) {
            if (!item.collected && this.checkCollision(player, item)) {
                item.collected = true;
                
                switch(item.type) {
                    case 'rope':
                        this.gameState.inventory.rope++;
                        break;
                    case 'torch':
                        this.gameState.inventory.torch++;
                        break;
                }
            }
        }
    }

    checkGameCompletion() {
        const player = this.gameState.player;
        
        // Game Over por cair
        if (player.y > 1000) {
            this.showDialog("Você caiu! Mais sorte na próxima escalada.");
            setTimeout(() => this.restartGame(), 2000);
        }
    }

    completeGame() {
        this.gameState.gameCompleted = true;
        this.gameState.currentTime = Date.now() - this.gameState.startTime;
        
        setTimeout(() => {
            this.screens.game.classList.add('hidden');
            this.screens.gameOver.classList.remove('hidden');
            
            this.updateGameOverStats();
        }, 1000);
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    render() {
        const ctx = this.ctx;
        const player = this.gameState.player;
        
        // Limpar canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Aplicar transformação da câmera
        ctx.save();
        ctx.translate(0, -this.camera.y);
        
        // Fundo baseado na altitude
        this.drawBackground();
        
        // Plataformas
        this.drawPlatforms();
        
        // Cavernas
        this.drawCaves();
        
        // Itens colecionáveis
        this.drawCollectibles();
        
        // Jogador
        this.drawPlayer();
        
        ctx.restore();
    }

    drawBackground() {
        const ctx = this.ctx;
        const altitude = this.gameState.altitude;
        
        // Mudar fundo baseado na altitude
        if (altitude < 1000) {
            ctx.fillStyle = '#87CEEB'; // Céu azul
        } else if (altitude < 2000) {
            ctx.fillStyle = '#A9A9A9'; // Montanha cinza
        } else {
            ctx.fillStyle = '#2F4F4F'; // Topo escuro
        }
        
        ctx.fillRect(0, 0, this.canvas.width, 3000);
        
        // Nuvens (decoração)
        ctx.fillStyle = 'white';
        for (let i = 0; i < 10; i++) {
            const x = (i * 200 + Date.now() * 0.01) % 1400 - 100;
            const y = -this.camera.y * 0.3 + i * 80;
            ctx.fillRect(x, y, 60, 20);
        }
    }

    drawPlatforms() {
        const ctx = this.ctx;
        const platforms = this.gameState.world.platforms;
        
        platforms.forEach(platform => {
            // Cor baseada no tipo
            switch(platform.type) {
                case 'ground':
                    ctx.fillStyle = '#8B4513'; // Marrom
                    break;
                case 'rock':
                    ctx.fillStyle = '#696969'; // Cinza
                    break;
                case 'ledge':
                    ctx.fillStyle = '#A9A9A9'; // Cinza claro
                    break;
                case 'summit':
                    ctx.fillStyle = '#FFD700'; // Dourado
                    break;
            }
            
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Textura nas plataformas de rocha
            if (platform.type === 'rock') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                for (let i = 0; i < platform.width; i += 10) {
                    ctx.fillRect(platform.x + i, platform.y, 5, 3);
                }
            }
        });
    }

    drawCaves() {
        const ctx = this.ctx;
        const caves = this.gameState.world.caves;
        
        caves.forEach(cave => {
            // Entrada da caverna
            ctx.fillStyle = cave.explored ? '#4ecdc4' : '#8B4513';
            ctx.fillRect(cave.x, cave.y, cave.width, cave.height);
            
            // Sinalizar caverna não explorada
            if (!cave.explored) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(cave.x + cave.width/2 - 5, cave.y - 10, 10, 10);
            }
        });
    }

    drawCollectibles() {
        const ctx = this.ctx;
        const collectibles = this.gameState.world.collectibles;
        
        collectibles.forEach(item => {
            if (!item.collected) {
                ctx.fillStyle = item.type === 'rope' ? '#8B4513' : '#FFA500';
                ctx.fillRect(item.x, item.y, 15, 15);
                
                // Efeito de brilho
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(item.x + 3, item.y + 3, 9, 9);
            }
        });
    }

    drawPlayer() {
        const ctx = this.ctx;
        const player = this.gameState.player;
        
        // Corpo do alpinista
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Mochila
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(player.x + 5, player.y + 10, 8, 15);
        
        // Capacete
        ctx.fillStyle = '#f9c74f';
        ctx.fillRect(player.x + 5, player.y, player.width - 10, 8);
        
        // Direção do olhar
        ctx.fillStyle = 'black';
        if (player.facing === 'right') {
            ctx.fillRect(player.x + 20, player.y + 15, 3, 3);
        } else {
            ctx.fillRect(player.x + 7, player.y + 15, 3, 3);
        }
        
        // Corda (se tiver)
        if (this.gameState.inventory.rope > 0) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(player.x + player.width/2, player.y + player.height);
            ctx.lineTo(player.x + player.width/2, player.y + player.height + 20);
            ctx.stroke();
        }
    }

    updateHUD() {
        // Altitude
        document.getElementById('altitude').textContent = Math.floor(this.gameState.altitude) + 'm';
        
        // Saúde
        document.getElementById('health').textContent = Math.floor(this.gameState.player.health);
        
        // Tempo
        if (this.gameState.gameStarted && !this.gameState.gameCompleted) {
            const elapsed = Date.now() - this.gameState.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Inventário
        document.querySelector('[data-item="rope"] .item-count').textContent = this.gameState.inventory.rope;
        document.querySelector('[data-item="torch"] .item-count').textContent = this.gameState.inventory.torch;
    }

    updateGameOverStats() {
        const time = this.gameState.currentTime;
        const minutes = Math.floor(time / 60000);
        const seconds = Math.floor((time % 60000) / 1000);
        
        document.getElementById('final-time').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('final-altitude').textContent = Math.floor(this.gameState.altitude) + 'm';
        
        const totalItems = this.gameState.inventory.rope + this.gameState.inventory.torch;
        document.getElementById('final-items').textContent = totalItems;
    }

    handleKeyDown(e) {
        if (!this.gameState.gameStarted) return;
        
        switch(e.key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                this.gameState.keys.left = true;
                break;
            case 'arrowright':
            case 'd':
                this.gameState.keys.right = true;
                break;
            case 'arrowup':
            case 'w':
            case ' ':
                this.gameState.keys.up = true;
                break;
            case 'shift':
                this.gameState.keys.shift = true;
                break;
            case 'e':
                // Interagir (usar corda, etc.)
                this.useItem();
                break;
        }
    }

    handleKeyUp(e) {
        switch(e.key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                this.gameState.keys.left = false;
                break;
            case 'arrowright':
            case 'd':
                this.gameState.keys.right = false;
                break;
            case 'arrowup':
            case 'w':
            case ' ':
                this.gameState.keys.up = false;
                break;
            case 'shift':
                this.gameState.keys.shift = false;
                break;
        }
    }

    useItem() {
        // Implementar uso de itens (corda para alcançar lugares altos, etc.)
        if (this.gameState.inventory.rope > 0) {
            // Lógica para usar corda
            this.gameState.player.velocityY = -20; // Impulso extra
            this.gameState.inventory.rope--;
            this.showDialog("Você usou uma corda para alcançar um lugar mais alto!");
        }
    }

    showDialog(text) {
        document.getElementById('dialog-text').textContent = text;
        document.getElementById('dialog').classList.remove('hidden');
    }

    hideDialog() {
        document.getElementById('dialog').classList.add('hidden');
    }

    restartGame() {
        this.screens.gameOver.classList.add('hidden');
        this.screens.start.classList.remove('hidden');
        this.initGame();
    }
}

// Iniciar o jogo
window.addEventListener('load', () => {
    new MountainClimber();
});
