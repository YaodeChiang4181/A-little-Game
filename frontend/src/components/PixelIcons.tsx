import React from 'react';

interface PixelIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * 16x16 專業點陣像素心 (Pixel Heart)
 * shape-rendering="crispEdges" 保證點對點硬邊像素渲染，完全無抗鋸齒模糊
 */
export const PixelHeart: React.FC<PixelIconProps & { filled?: boolean }> = ({
  size = 20,
  filled = true,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={{ shapeRendering: 'crispEdges', display: 'inline-block', verticalAlign: 'middle' }}
    >
      {filled ? (
        <>
          {/* 滿血像素心：外框與高光 */}
          <rect x="2" y="1" width="4" height="2" fill="#000" />
          <rect x="10" y="1" width="4" height="2" fill="#000" />
          <rect x="1" y="3" width="6" height="2" fill="#000" />
          <rect x="9" y="3" width="6" height="2" fill="#000" />
          <rect x="0" y="5" width="16" height="4" fill="#000" />
          <rect x="2" y="9" width="12" height="2" fill="#000" />
          <rect x="4" y="11" width="8" height="2" fill="#000" />
          <rect x="6" y="13" width="4" height="2" fill="#000" />
          <rect x="7" y="15" width="2" height="1" fill="#000" />

          {/* 紅色主體 */}
          <rect x="2" y="2" width="4" height="3" fill="#ef4444" />
          <rect x="10" y="2" width="4" height="3" fill="#ef4444" />
          <rect x="1" y="5" width="14" height="4" fill="#dc2626" />
          <rect x="3" y="9" width="10" height="2" fill="#dc2626" />
          <rect x="5" y="11" width="6" height="2" fill="#b91c1c" />
          <rect x="7" y="13" width="2" height="2" fill="#991b1b" />

          {/* 復古白色高光像素點 */}
          <rect x="3" y="2" width="2" height="2" fill="#ffffff" />
          <rect x="2" y="4" width="1" height="1" fill="#ffffff" />
        </>
      ) : (
        <>
          {/* 空心像素槽（破裂/已消耗） */}
          <rect x="2" y="1" width="4" height="2" fill="#334155" />
          <rect x="10" y="1" width="4" height="2" fill="#334155" />
          <rect x="1" y="3" width="2" height="2" fill="#334155" />
          <rect x="6" y="3" width="4" height="2" fill="#334155" />
          <rect x="13" y="3" width="2" height="2" fill="#334155" />
          <rect x="0" y="5" width="2" height="4" fill="#334155" />
          <rect x="14" y="5" width="2" height="4" fill="#334155" />
          <rect x="2" y="9" width="2" height="2" fill="#334155" />
          <rect x="12" y="9" width="2" height="2" fill="#334155" />
          <rect x="4" y="11" width="2" height="2" fill="#334155" />
          <rect x="10" y="11" width="2" height="2" fill="#334155" />
          <rect x="6" y="13" width="4" height="2" fill="#334155" />
          <rect x="2" y="5" width="12" height="4" fill="#0f172a" opacity="0.6" />
        </>
      )}
    </svg>
  );
};

/**
 * 24x24 專業像素西洋棋圖騰 (Pixel Chess Sprites)
 */
export const PixelPieceIcon: React.FC<{
  type: string;
  size?: number;
  color?: 'white' | 'black';
}> = ({ type, size = 36, color = 'white' }) => {
  const isWhite = color === 'white';
  const mainColor = isWhite ? '#f8fafc' : '#1e293b';
  const shadeColor = isWhite ? '#cbd5e1' : '#0f172a';
  const outlineColor = isWhite ? '#334155' : '#000000';
  const highlightColor = isWhite ? '#ffffff' : '#475569';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ shapeRendering: 'crispEdges', display: 'block' }}
    >
      {/* 依據棋子種類渲染高精度像素幾何 */}
      {type === 'pawn' && (
        <g>
          {/* 小兵 Pawn */}
          <rect x="9" y="3" width="6" height="5" fill={outlineColor} />
          <rect x="10" y="4" width="4" height="3" fill={mainColor} />
          <rect x="11" y="4" width="1" height="1" fill={highlightColor} />
          <rect x="10" y="8" width="4" height="2" fill={outlineColor} />
          <rect x="8" y="10" width="8" height="7" fill={outlineColor} />
          <rect x="9" y="11" width="6" height="5" fill={mainColor} />
          <rect x="9" y="14" width="6" height="2" fill={shadeColor} />
          <rect x="5" y="17" width="14" height="4" fill={outlineColor} />
          <rect x="6" y="18" width="12" height="2" fill={mainColor} />
        </g>
      )}

      {type === 'knight' && (
        <g>
          {/* 騎士 Knight */}
          <rect x="7" y="3" width="7" height="4" fill={outlineColor} />
          <rect x="6" y="5" width="4" height="6" fill={outlineColor} />
          <rect x="13" y="4" width="5" height="7" fill={outlineColor} />
          <rect x="8" y="4" width="6" height="4" fill={mainColor} />
          <rect x="7" y="6" width="7" height="8" fill={mainColor} />
          <rect x="14" y="6" width="3" height="4" fill={shadeColor} />
          <rect x="8" y="6" width="2" height="2" fill={highlightColor} />
          <rect x="11" y="5" width="2" height="2" fill={outlineColor} /> {/* 眼睛 */}
          <rect x="8" y="13" width="10" height="4" fill={outlineColor} />
          <rect x="9" y="14" width="8" height="3" fill={shadeColor} />
          <rect x="5" y="17" width="14" height="4" fill={outlineColor} />
          <rect x="6" y="18" width="12" height="2" fill={mainColor} />
        </g>
      )}

      {type === 'rook' && (
        <g>
          {/* 主塔 Rook (城堡垛口) */}
          <rect x="6" y="3" width="3" height="4" fill={outlineColor} />
          <rect x="11" y="3" width="2" height="4" fill={outlineColor} />
          <rect x="15" y="3" width="3" height="4" fill={outlineColor} />
          <rect x="7" y="4" width="1" height="2" fill={mainColor} />
          <rect x="16" y="4" width="1" height="2" fill={mainColor} />
          <rect x="6" y="6" width="12" height="4" fill={outlineColor} />
          <rect x="7" y="7" width="10" height="2" fill={mainColor} />
          <rect x="8" y="10" width="8" height="7" fill={outlineColor} />
          <rect x="9" y="10" width="6" height="7" fill={mainColor} />
          <rect x="11" y="12" width="2" height="3" fill={shadeColor} />
          <rect x="5" y="17" width="14" height="4" fill={outlineColor} />
          <rect x="6" y="18" width="12" height="2" fill={mainColor} />
        </g>
      )}

      {type === 'bishop' && (
        <g>
          {/* 主教 Bishop (尖頂法帽與十字痕) */}
          <rect x="11" y="2" width="2" height="2" fill={outlineColor} />
          <rect x="9" y="4" width="6" height="3" fill={outlineColor} />
          <rect x="8" y="6" width="8" height="7" fill={outlineColor} />
          <rect x="9" y="5" width="6" height="7" fill={mainColor} />
          <rect x="10" y="6" width="1" height="4" fill={outlineColor} /> {/* 象徵開口 */}
          <rect x="10" y="13" width="4" height="4" fill={outlineColor} />
          <rect x="11" y="13" width="2" height="4" fill={shadeColor} />
          <rect x="5" y="17" width="14" height="4" fill={outlineColor} />
          <rect x="6" y="18" width="12" height="2" fill={mainColor} />
        </g>
      )}

      {type === 'queen' && (
        <g>
          {/* 皇后 Queen (三叉王冠) */}
          <rect x="5" y="4" width="2" height="2" fill={outlineColor} />
          <rect x="11" y="2" width="2" height="2" fill={outlineColor} />
          <rect x="17" y="4" width="2" height="2" fill={outlineColor} />
          <rect x="5" y="6" width="14" height="6" fill={outlineColor} />
          <rect x="7" y="7" width="10" height="4" fill={mainColor} />
          <rect x="11" y="5" width="2" height="4" fill={mainColor} />
          <rect x="6" y="8" width="2" height="2" fill={highlightColor} />
          <rect x="8" y="12" width="8" height="5" fill={outlineColor} />
          <rect x="9" y="12" width="6" height="5" fill={shadeColor} />
          <rect x="4" y="17" width="16" height="4" fill={outlineColor} />
          <rect x="5" y="18" width="14" height="2" fill={mainColor} />
        </g>
      )}

      {type === 'king' && (
        <g>
          {/* 國王 King (十字寶冠) */}
          <rect x="11" y="1" width="2" height="4" fill={outlineColor} />
          <rect x="10" y="2" width="4" height="2" fill={outlineColor} />
          <rect x="11" y="2" width="2" height="1" fill="#f59e0b" /> {/* 寶石 */}
          <rect x="7" y="5" width="10" height="6" fill={outlineColor} />
          <rect x="8" y="6" width="8" height="5" fill={mainColor} />
          <rect x="8" y="7" width="2" height="2" fill={highlightColor} />
          <rect x="9" y="11" width="6" height="6" fill={outlineColor} />
          <rect x="10" y="11" width="4" height="6" fill={shadeColor} />
          <rect x="4" y="17" width="16" height="4" fill={outlineColor} />
          <rect x="5" y="18" width="14" height="2" fill={mainColor} />
        </g>
      )}
    </svg>
  );
};

/**
 * 16x16 戰場點陣標誌 (Pixel Terrain Sigil)
 */
export const PixelTerrainSigil: React.FC<{
  terrainId: string;
  size?: number;
  color?: string;
}> = ({ terrainId, size = 16, color = '#ffcc00' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ shapeRendering: 'crispEdges', display: 'inline-block', verticalAlign: 'middle' }}
    >
      {terrainId === 'swamp' && (
        <g fill={color}>
          {/* 泥沼水紋 */}
          <rect x="2" y="5" width="6" height="2" />
          <rect x="10" y="5" width="4" height="2" />
          <rect x="4" y="9" width="8" height="2" />
          <rect x="1" y="13" width="5" height="2" />
          <rect x="8" y="13" width="6" height="2" />
        </g>
      )}

      {terrainId === 'arena' && (
        <g fill={color}>
          {/* 雙刃交叉 */}
          <rect x="2" y="2" width="3" height="3" />
          <rect x="11" y="2" width="3" height="3" />
          <rect x="4" y="5" width="3" height="3" />
          <rect x="9" y="5" width="3" height="3" />
          <rect x="6" y="8" width="4" height="2" />
          <rect x="7" y="10" width="2" height="4" />
        </g>
      )}

      {terrainId === 'palace' && (
        <g fill={color}>
          {/* 皇冠柱廊 */}
          <rect x="2" y="3" width="2" height="3" />
          <rect x="7" y="2" width="2" height="4" />
          <rect x="12" y="3" width="2" height="3" />
          <rect x="2" y="6" width="12" height="2" />
          <rect x="3" y="8" width="2" height="5" />
          <rect x="7" y="8" width="2" height="5" />
          <rect x="11" y="8" width="2" height="5" />
          <rect x="1" y="13" width="14" height="2" />
        </g>
      )}

      {terrainId === 'mirror_hall' && (
        <g fill={color}>
          {/* 雙對稱菱形 */}
          <rect x="7" y="2" width="2" height="2" />
          <rect x="5" y="4" width="6" height="2" />
          <rect x="3" y="6" width="10" height="4" />
          <rect x="5" y="10" width="6" height="2" />
          <rect x="7" y="12" width="2" height="2" />
        </g>
      )}

      {terrainId === 'sanctuary' && (
        <g fill={color}>
          {/* 靜默聖光十字 */}
          <rect x="7" y="2" width="2" height="12" />
          <rect x="3" y="5" width="10" height="2" />
          <rect x="5" y="12" width="6" height="2" />
        </g>
      )}

      {terrainId === 'storm_cliff' && (
        <g fill={color}>
          {/* 霹靂閃電 */}
          <rect x="8" y="1" width="4" height="3" />
          <rect x="6" y="4" width="4" height="3" />
          <rect x="4" y="7" width="8" height="2" />
          <rect x="5" y="9" width="3" height="3" />
          <rect x="3" y="12" width="3" height="3" />
        </g>
      )}

      {terrainId === 'town' && (
        <g fill={color}>
          {/* 城鎮尖頂屋瓦 */}
          <rect x="7" y="2" width="2" height="2" />
          <rect x="5" y="4" width="6" height="2" />
          <rect x="3" y="6" width="10" height="2" />
          <rect x="3" y="8" width="10" height="6" />
          <rect x="6" y="10" width="4" height="4" fill="#000" />
        </g>
      )}
    </svg>
  );
};
