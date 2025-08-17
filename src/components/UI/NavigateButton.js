function NavigateButton(props) {
  return (
    <button className="navigate-button" onClick={props.onClick} type="button">
      <img src={props.icon} alt="Zoom" />
    </button>
  );
}

export default NavigateButton;
