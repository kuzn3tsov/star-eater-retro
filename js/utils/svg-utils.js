export class SVGUtils {
    static processSVGContent(svgContent, width, height) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');

            // Check for XML parsing errors
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                throw new Error('SVG parsing error: ' + parseError.textContent);
            }

            const svgElement = doc.querySelector('svg');
            if (svgElement) {
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

                if (!svgElement.getAttribute('viewBox')) {
                    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
                }

                return svgElement.outerHTML;
            }
        } catch (error) {
            console.warn('Error processing SVG content:', error);
        }

        return svgContent;
    }

    static createFallbackSVG(type, width, height, color = '#daa520') {
        const fallbacks = {
            'player': `
                <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 4 L44 24 L34 24 L34 44 L14 44 L14 24 L4 24 Z"
                          fill="${color}" stroke="#000" stroke-width="2"/>
                    <circle cx="24" cy="20" r="6" fill="#00ffff" stroke="#000" stroke-width="1"/>
                    <rect x="18" y="38" width="12" height="4" fill="#ff6b00" stroke="#000" stroke-width="1"/>
                    <rect x="20" y="42" width="8" height="2" fill="#ff4444" stroke="#000" stroke-width="1"/>
                </svg>
            `,
            'enemy': (enemyType, enemyCategory) => {
                const colors = {
                    'teal': '#20b2aa', 'silver': '#c0c0c0', 'blue': '#1e90ff', 'pink': '#ff69b4'
                };
                const color = colors[enemyType] || '#20b2aa';
                const symbols = {
                    'rammer': 'R', 'shooter': 'S', 'beam-shooter': 'B', 'destroyer': 'D'
                };
                const symbol = symbols[enemyCategory] || 'E';

                return `
                    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                        <rect width="${width}" height="${height}" fill="${color}" opacity="0.8"/>
                        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dy="0.3em" font-size="10" fill="white">${symbol}</text>
                    </svg>
                `;
            },
            'collectible': (collectibleType) => {
                const colors = {
                    'gold-star': '#daa520', 'green-star': '#00ff00', 'blue-star': '#1e90ff',
                    'purple-star': '#9370db', 'red-rocket': '#ff4444', 'azure-bomb': '#00ffff'
                };
                const color = colors[collectibleType] || '#daa520';

                if (collectibleType.includes('star')) {
                    return `
                        <svg width="${width}" height="${height}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2 L14.5 8.5 L21.5 9.5 L16 14 L17.5 21 L12 17 L6.5 21 L8 14 L2.5 9.5 L9.5 8.5 Z"
                                  fill="${color}"/>
                        </svg>
                    `;
                } else if (collectibleType === 'red-rocket') {
                    return `
                        <svg width="${width}" height="${height}" viewBox="0 0 20 32" xmlns="http://www.w3.org/2000/svg">
                            <rect x="6" y="0" width="8" height="24" fill="${color}"/>
                            <polygon points="10,0 20,8 0,8" fill="${color}"/>
                            <rect x="4" y="24" width="4" height="6" fill="#8b4513"/>
                            <rect x="12" y="24" width="4" height="6" fill="#8b4513"/>
                        </svg>
                    `;
                } else if (collectibleType === 'azure-bomb') {
                    return `
                        <svg width="${width}" height="${height}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="8" fill="${color}"/>
                            <rect x="9" y="2" width="2" height="6" fill="#8b4513"/>
                            <circle cx="10" cy="4" r="1" fill="#ffff00"/>
                        </svg>
                    `;
                }

                return `<div style="width:100%;height:100%;background:red;"></div>`;
            },
            'projectile': (projectileType) => {
                const colors = {
                    'burst': '#ff4444',
                    'meteor': '#8b4513',
                    'big-meteor': '#654321'
                };
                const color = colors[projectileType] || '#ff4444';
                const size = { width: 8, height: 8 }; // Default size

                if (projectileType.includes('meteor')) {
                    return `
                        <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="${size.width / 2}" cy="${size.height / 2}" r="${size.width / 2 - 2}" fill="${color}"/>
                            <circle cx="${size.width / 3}" cy="${size.height / 3}" r="2" fill="#daa520"/>
                            <circle cx="${size.width * 2 / 3}" cy="${size.height * 2 / 3}" r="1" fill="#daa520"/>
                        </svg>
                    `;
                }

                return `
                    <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="${size.width / 2}" cy="${size.height / 2}" r="${size.width / 2}" fill="${color}"/>
                        <circle cx="${size.width / 2}" cy="${size.height / 2}" r="${size.width / 4}" fill="#ffff00"/>
                    </svg>
                `;
            },
            'boss': (bossName, width, height, color) => {
                const symbols = {
                    'Meteor Commander': '☄️',
                    'Skull Reaper': '💀',
                    'The Machine': '⚙️',
                    'Biohazard Titan': '☣️',
                    'Cosmic Horror': '👁️'
                };
                const symbol = symbols[bossName] || '👑';

                return `
                    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                        <rect width="${width}" height="${height}" fill="${color}" opacity="0.8"/>
                        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dy="0.3em" font-size="24" fill="white">${symbol}</text>
                    </svg>
                `;
            }
        };

        return fallbacks[type] || `<div style="width:100%;height:100%;background:${color};"></div>`;
    }
}