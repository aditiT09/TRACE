// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TracePermissions {

    enum Permission {
        LOCKED,
        READ_ONLY,
        RESTRICTED,
        FULL
    }

    address public owner;
    address public agent;

    uint256 public lastHeartbeat;

    // Demo decay times
    uint256 public constant FULL_DURATION = 2 minutes;
    uint256 public constant RESTRICTED_DURATION = 4 minutes;
    uint256 public constant READ_ONLY_DURATION = 6 minutes;

    // =========================================================
    // EVENTS
    // =========================================================

    event Heartbeat(
        address indexed owner,
        uint256 timestamp
    );

    event ActionAttested(
        address indexed agent,
        string action,
        Permission permission,
        uint256 timestamp
    );

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    constructor(address _agent) {
        owner = msg.sender;
        agent = _agent;
        lastHeartbeat = block.timestamp;
    }

    // =========================================================
    // MODIFIERS
    // =========================================================

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only owner can perform this action"
        );
        _;
    }

    modifier onlyAgent() {
        require(
            msg.sender == agent,
            "Only agent can perform this action"
        );
        _;
    }

    // =========================================================
    // HEARTBEAT
    // =========================================================

    function heartbeat()
        external
        onlyOwner
    {
        lastHeartbeat = block.timestamp;

        emit Heartbeat(
            msg.sender,
            block.timestamp
        );
    }

    // =========================================================
    // PERMISSION ENGINE
    // =========================================================

    function getCurrentPermission()
        public
        view
        returns (Permission)
    {
        uint256 inactiveTime =
            block.timestamp - lastHeartbeat;

        if (inactiveTime < FULL_DURATION) {
            return Permission.FULL;
        }

        if (inactiveTime < RESTRICTED_DURATION) {
            return Permission.RESTRICTED;
        }

        if (inactiveTime < READ_ONLY_DURATION) {
            return Permission.READ_ONLY;
        }

        return Permission.LOCKED;
    }

    // =========================================================
    // ACTION PERMISSION CHECK
    // =========================================================

    function canPerformAction(
        string memory action
    )
        public
        view
        returns (bool)
    {
        Permission current =
            getCurrentPermission();

        // FULL can perform everything
        if (current == Permission.FULL) {
            return true;
        }

        // RESTRICTED can perform low-risk actions
        if (current == Permission.RESTRICTED) {

            if (
                keccak256(bytes(action)) ==
                keccak256(bytes("SEND_MESSAGE"))
            ) {
                return true;
            }

            if (
                keccak256(bytes(action)) ==
                keccak256(bytes("SCHEDULE_MEETING"))
            ) {
                return true;
            }

            return false;
        }

        // READ_ONLY cannot perform actions
        if (current == Permission.READ_ONLY) {
            return false;
        }

        // LOCKED cannot perform anything
        return false;
    }

    // =========================================================
    // VERIFIED ATTESTATION
    // =========================================================

    function attestAction(
        string memory action
    )
        external
        onlyAgent
    {
        // Permission is determined by the smart contract.
        // The agent cannot provide or manipulate this value.
        Permission current =
            getCurrentPermission();

        // The action must actually be allowed.
        require(
            canPerformAction(action),
            "Action not permitted"
        );

        // Record the verified action on-chain.
        emit ActionAttested(
            msg.sender,
            action,
            current,
            block.timestamp
        );
    }

    // =========================================================
    // INACTIVE TIME
    // =========================================================

    function getInactiveTime()
        external
        view
        returns (uint256)
    {
        return block.timestamp - lastHeartbeat;
    }
}