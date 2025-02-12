figma.showUI(__html__, { width: 400, height: 500 });

figma.ui.onmessage = (msg) => {
    if (msg.type === "convert") {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
            figma.ui.postMessage({ type: "error", message: "선택한 요소가 없습니다." });
            return;
        }

        // 선택한 요소를 전체 계층 구조로 변환하여 React Styled Components 코드 생성
        const reactStyledCode = generateStyledComponent(selection[0]);

        // 변환된 코드 UI로 전송
        figma.ui.postMessage({ type: "reactStyledCode", code: reactStyledCode });
    }
};

// RGBA 색상 변환 함수
function rgbaColor(color) {
    if (!color) return "transparent";
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
}

// Figma 요소 스타일 변환
function getStyles(node) {
    let styles = "";

    // 🟢 📌 [텍스트 요소] - `TEXT` 타입에만 적용
    if (node.type === "TEXT") {
        styles = `
  font-size: ${node.fontSize || 16}px;
  font-weight: ${node.fontWeight || 400};
  color: ${node.fills && node.fills.length > 0 && node.fills[0].color ? rgbaColor(node.fills[0].color) : "#000"};
  text-align: ${node.textAlignHorizontal || "left"};
  line-height: ${(node.lineHeight && node.lineHeight.value) ? node.lineHeight.value + "px" : "normal"};
  margin: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px;
`;
    } else {
        // 🔵 📌 [일반 컨테이너 요소] - `Frame`, `Group`, `Rectangle` 등에 적용
        styles = `
  width: ${node.width}px;
  height: ${node.height}px;
  display: ${node.layoutMode === "NONE" ? "block" : "flex"};
  flex-direction: ${node.layoutMode === "HORIZONTAL" ? "row" : "column"};
  justify-content: ${node.primaryAxisAlignItems || "flex-start"};
  align-items: ${node.counterAxisAlignItems || "flex-start"};
  background-color: ${node.fills && node.fills.length > 0 && node.fills[0].color ? rgbaColor(node.fills[0].color) : "transparent"};
  border-radius: ${node.cornerRadius || 0}px;
  margin: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px;
  gap: ${node.itemSpacing || 0}px;
`;
    }

    return styles;
}

// Figma 요소를 하나의 Styled Components 컴포넌트로 변환
function generateStyledComponent(node) {
    const componentName = node.name.replace(/\s+/g, "") || "GeneratedComponent";

    let styles = `import React from 'react';\nimport styled from 'styled-components';\n\n`;

    // 부모 스타일 정의
    styles += `const Wrapper = styled.div\`${getStyles(node)}\`;\n\n`;

    let childElements = "";

    function generateChildElements(child, index) {
        const className = child.name ? child.name.replace(/\s+/g, "-").toLowerCase() : `child-${index}`;

        styles += `const ${className} = styled.div\`${getStyles(child)}\`;\n\n`;

        let childContent = child.type === "TEXT" ? `<p>${child.characters || child.name}</p>` : "";

        if ("children" in child && child.children.length > 0) {
            child.children.forEach((nestedChild, nestedIndex) => {
                childContent += generateChildElements(nestedChild, `${index}-${nestedIndex}`);
            });
        }

        childElements += `\n      <div className="${className}">${childContent}</div>`;
    }

    // 자식 요소들 변환
    if ("children" in node && node.children.length > 0) {
        node.children.forEach((child, index) => {
            generateChildElements(child, index);
        });
    }

    // 최종 컴포넌트 생성
    const componentCode = `const ${componentName} = () => {
  return (
    <Wrapper>
      ${childElements}
    </Wrapper>
  );
};

export default ${componentName};\n`;

    return styles + componentCode;
}
