figma.showUI(__html__, { width: 400, height: 500 });

figma.ui.onmessage = (msg) => {
    if (msg.type === "convert") {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
            figma.ui.postMessage({ type: "error", message: "선택한 요소가 없습니다." });
            return;
        }

        // 선택한 요소를 HTML + CSS로 변환
        const { html, css } = generateHTMLAndCSS(selection[0]);

        // 변환된 코드 UI로 전송
        figma.ui.postMessage({ type: "htmlCSSCode", html, css });
    }
};

// RGBA 색상 변환 함수
function rgbaColor(color) {
    if (!color) return "transparent";
    const alpha = color.a !== undefined ? color.a : 1;
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
}

// Figma 요소 스타일 변환
function getStyles(node, className) {
    let styles = `.${className} {`;

    styles += `
  width: ${node.width}px;
  height: ${node.height}px;
  display: ${node.layoutMode === "NONE" ? "block" : "flex"};
  flex-direction: ${node.layoutMode === "HORIZONTAL" ? "row" : "column"};
  justify-content: ${node.primaryAxisAlignItems || "flex-start"};
  align-items: ${node.counterAxisAlignItems || "flex-start"};
  background-color: ${node.fills && node.fills.length > 0 && node.fills[0].color ? rgbaColor(node.fills[0].color) : "transparent"};
  border-radius: ${node.cornerRadius || 0}px;
  margin: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px;
  gap: ${node.itemSpacing || 0}px;`;

    if (node.type === "TEXT") {
        styles += `
  font-size: ${node.fontSize || 16}px;
  font-weight: ${node.fontWeight || 400};
  color: ${node.fills && node.fills.length > 0 && node.fills[0].color ? rgbaColor(node.fills[0].color) : "#000"};
  text-align: ${node.textAlignHorizontal || "left"};
  line-height: ${(node.lineHeight && node.lineHeight.value) ? node.lineHeight.value + "px" : "normal"};`;
    }

    styles += "\n}\n";
    return styles;
}

// Figma 요소를 HTML + CSS로 변환
function generateHTMLAndCSS(node, depth = 0) {
    const className = node.name ? node.name.replace(/\s+/g, "-").toLowerCase() : `element-${depth}`;
    let html = "";
    let css = getStyles(node, className);

    if (node.type === "TEXT") {
        html = `<p class="${className}">${node.characters || node.name}</p>`;
    } else if (node.type === "IMAGE") {
        html = `<img class="${className}" src="IMAGE_URL_HERE" alt="${node.name}" />`;
    } else {
        let childHTML = "";
        if ("children" in node && node.children.length > 0) {
            node.children.forEach((child, index) => {
                const { html: childHtml, css: childCss } = generateHTMLAndCSS(child, `${depth}-${index}`);
                childHTML += `\n    ${childHtml}`;
                css += childCss;
            });
        }
        html = `<div class="${className}">${childHTML}\n</div>`;
    }

    return { html, css };
}
