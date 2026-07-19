import React from 'react';
import styled, { css } from 'styled-components';
import useMeasure from 'react-use-measure';
import { brandColor } from '../../theme/brandColor';
import { useSpring, animated } from 'react-spring';
import { IoIosArrowDropdown, IoIosArrowDropup } from 'react-icons/io';

const DEFAULT_BORDER_COLOR = 'rgba(67, 185, 143, 0.8)';

const Panel = styled.div`
  width: ${(props) => (props.$fullWidth ? '100%' : '350px')};
  text-align: left;
  border-radius: 16px;
  overflow: hidden;
`;

const gradientBorderStyles = css`
  border-color: transparent;
  background-image: linear-gradient(
      var(--card-bg, #ffffff),
      var(--card-bg, #ffffff)
    ),
    ${(props) => props.$borderGradient};
  background-origin: border-box;
  background-clip: padding-box, border-box;
`;

const solidBorderStyles = css`
  border-color: ${(props) => props.$borderColor || DEFAULT_BORDER_COLOR};
  background-color: var(--card-bg, #ffffff);
`;

const PanelHeading = styled.div`
  border-style: solid;
  border-width: 1px 1px 0 8px;
  ${(props) =>
    props.$borderGradient ? gradientBorderStyles : solidBorderStyles}
  color: var(--card-text, #000000);
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border-top-right-radius: 16px;
  border-top-left-radius: 16px;
`;

const PanelContent = styled(animated.div)`
  border-style: solid;
  border-width: 0 1px 1px 8px;
  ${(props) =>
    props.$borderGradient ? gradientBorderStyles : solidBorderStyles}
  padding: 0px 10px;
  color: var(--card-text, #000000);
  overflow: hidden;
  border-bottom-right-radius: 16px;
  border-bottom-left-radius: 16px;
`;

const PanelContentInner = styled.div`
  padding: 20px 0;
`;

const CollapsableCard = ({
  card_title = null,
  card_summery = null,
  children = null,
  isOpen = false,
  fullWidth = false,
  className = '',
  headingClassName = '',
  titleSlot = null,
  summarySlot = null,
  borderColor = undefined,
  borderGradient = undefined
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(!isOpen);
  const [ref, bounds] = useMeasure();

  const toggleWrapperAnimatedStyle = useSpring({
    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
  });
  const panelContentAnimatedStyle = useSpring({
    height: isCollapsed ? 16 : bounds.height
  });

  const togglePanel = () => {
    setIsCollapsed((prevState) => !prevState);
  };

  const resolvedBorderColor =
    borderColor || (borderGradient ? undefined : DEFAULT_BORDER_COLOR);

  return (
    <Panel className={className} $fullWidth={fullWidth}>
      <PanelHeading
        className={headingClassName}
        onClick={togglePanel}
        $borderColor={resolvedBorderColor}
        $borderGradient={borderGradient}
      >
        <div>
          <div>
            {titleSlot ? (
              titleSlot
            ) : (
              <span className="text-dark-gray dark:text-white text-xl font-light uppercase">
                {card_title}
              </span>
            )}
          </div>
          {(summarySlot || card_summery) && (
            <div>
              {summarySlot ? (
                summarySlot
              ) : (
                <span className="text-xs font-light w-6 h-6 rounded-full text-gray-400 dark:text-gray-500">
                  {card_summery}
                </span>
              )}
            </div>
          )}
        </div>
        <animated.div style={toggleWrapperAnimatedStyle}>
          <span
            className="text-4xl uppercase leading-normal font-thin"
            style={{
              color:
                resolvedBorderColor ||
                (borderGradient ? brandColor.primary() : DEFAULT_BORDER_COLOR)
            }}
          >
            {isCollapsed ? <IoIosArrowDropdown /> : <IoIosArrowDropup />}
          </span>
        </animated.div>
      </PanelHeading>
      <PanelContent
        style={panelContentAnimatedStyle}
        $borderColor={resolvedBorderColor}
        $borderGradient={borderGradient}
      >
        <PanelContentInner ref={ref}>{children}</PanelContentInner>
      </PanelContent>
    </Panel>
  );
};

export default CollapsableCard;
